"""EDITH — a conversational Hinglish voice tutor backed by Claude.

The browser does speech-to-text and text-to-speech (Web Speech API); this
route only turns the conversation so far into EDITH's next spoken reply and
streams it back as plain text so the client can start speaking sentence by
sentence before the reply is complete.
"""

import logging
import os
import time
from collections import defaultdict
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Pattern
from app.routes.auth import get_current_user_from_header

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/voice", tags=["voice"])

# EDITH is switched off by default; set EDITH_ENABLED=true (and VITE_EDITH_ENABLED=true on the frontend) to bring it back.
EDITH_ENABLED = os.getenv("EDITH_ENABLED", "false").strip().lower() in ("1", "true", "yes")
EDITH_MODEL = os.getenv("EDITH_MODEL", "claude-opus-5-5")
DAILY_TURN_LIMIT = int(os.getenv("EDITH_DAILY_TURN_LIMIT", "200"))
MAX_HISTORY_MESSAGES = 40
ERROR_MARKER = "[[EDITH_ERROR]]"

_turns_by_user: dict[int, list[float]] = defaultdict(list)
_client = None


def _ai_configured() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


def _get_client():
    global _client
    if _client is None:
        from anthropic import AsyncAnthropic

        _client = AsyncAnthropic()
    return _client


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class VoiceChatRequest(BaseModel):
    mode: Literal["teach", "test", "mock"] = "teach"
    language: Literal["hinglish", "english"] = "hinglish"
    topic_slug: Optional[str] = None
    messages: list[ChatMessage] = Field(..., min_length=1)


PERSONA = """You are EDITH, a warm, sharp interview-prep mentor who talks to the learner by voice. You help software engineers prepare for job switches and interviews: DSA, system design, CS fundamentals, frontend and behavioral rounds.

Everything you write is converted to speech, so:
- Write plain spoken sentences. No markdown, bullet points, headings, tables, emojis or code blocks.
- Never read code character by character. Describe the logic in words ("left pointer start pe, right pointer end pe").
- Keep each turn short: 2 to 5 sentences, then hand the turn back, usually with one clear question.
- Ask only one question at a time and wait for the answer.
- The learner's words come from speech recognition and may contain mis-heard technical terms; interpret them generously."""

LANGUAGE_RULES = {
    "hinglish": """Speak in natural Hinglish, the way Indian engineers talk with each other: Hindi sentence flow written in Roman script, with technical terms in English. Example: "Dekho, two pointer ka basic idea simple hai — array sorted hai, toh hum dono ends se start karte hain." Never use Devanagari script. If the learner speaks pure English or asks for English, switch to English.""",
    "english": "Speak in clear, simple Indian-English. Friendly and encouraging, never robotic.",
}

MODE_RULES = {
    "teach": """MODE: TEACH.
Teach the topic like a friendly senior: start with the intuition and a real-life analogy, then the core idea, then when to recognise it in an interview, then one example problem walked through in words. After each small chunk, check understanding with a quick question ("Samjha? Batao, isme time complexity kya hogi?"). If the learner is confused, re-explain differently. Follow the learner's questions.""",
    "test": """MODE: TEST (viva-style quiz).
Run a quiz of 5 questions on the topic, one at a time, increasing in difficulty. Mix concept questions ("kab use karoge?"), complexity questions and "approach batao" questions for the listed problems.
After each answer: say clearly whether it is correct, partially correct or wrong, give the key point they missed in one or two sentences, then ask the next question and say its number ("Question 3 of 5").
After the fifth answer give a final verdict: a score out of 10, two strengths, two things to revise, and suggest whether to retake the test or move to the next topic. Say the score as "Score: X out of 10".""",
    "mock": """MODE: MOCK INTERVIEW.
Act as a friendly but realistic interviewer at a product company. Begin with a one-line intro and ask the candidate to introduce themselves briefly, then ask one main interview question on the topic. Probe with follow-ups the way a real interviewer would: clarifying requirements, edge cases, complexity, trade-offs, scaling. Do not give away answers; give small hints only if they are stuck for a while. After about 6 to 8 exchanges, or if the candidate says they are done, give structured feedback: hire / lean hire / no hire, what went well, and what to improve.""",
}


def _topic_context(db: Session, slug: Optional[str]) -> str:
    if not slug:
        return "No specific topic selected. Ask the learner what they want to prepare (DSA pattern, system design, CS fundamentals, frontend or behavioral) and continue from there."
    pattern = db.query(Pattern).filter_by(slug=slug).first()
    if not pattern:
        return f"The learner picked topic '{slug}', which is not in the curriculum. Ask what they want to cover."

    lines = [
        f"CURRENT TOPIC: {pattern.name} (track: {pattern.track_category})",
        f"Summary: {pattern.description}",
        "Revision notes from the curriculum (use these as ground truth, but explain in your own spoken words):",
        pattern.revision_note_md or "",
        "",
        "Practice questions in this topic, by tier (1 = foundation, 4 = expert):",
    ]
    for p in sorted(pattern.problems, key=lambda p: (p.tier, p.display_order)):
        line = f"- [Tier {p.tier}] {p.title}"
        if p.guide_explanation:
            line += f" — key idea: {p.guide_explanation}"
        lines.append(line)
    return "\n".join(lines)


def _check_quota(user_id: int) -> None:
    now = time.time()
    recent = [t for t in _turns_by_user[user_id] if now - t < 86400]
    if len(recent) >= DAILY_TURN_LIMIT:
        raise HTTPException(status_code=429, detail="EDITH ka aaj ka limit ho gaya. Kal phir milte hain!")
    recent.append(now)
    _turns_by_user[user_id] = recent


@router.get("/status")
def voice_status():
    ai = EDITH_ENABLED and _ai_configured()
    return {"enabled": EDITH_ENABLED, "ai_enabled": ai, "model": EDITH_MODEL if ai else None}


@router.post("/chat")
async def voice_chat(
    req: VoiceChatRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not EDITH_ENABLED:
        raise HTTPException(status_code=404, detail="EDITH is disabled on this server")
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to talk with EDITH's AI mode")
    if not _ai_configured():
        raise HTTPException(status_code=503, detail="EDITH AI mode is not configured on the server (ANTHROPIC_API_KEY missing)")

    messages = [m.model_dump() for m in req.messages][-MAX_HISTORY_MESSAGES:]
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    if not messages:
        raise HTTPException(status_code=400, detail="Conversation must contain a user message")
    _check_quota(user.id)

    # Stable, per-topic system prompt so repeated turns hit the prompt cache.
    system_text = "\n\n".join([
        PERSONA,
        LANGUAGE_RULES[req.language],
        MODE_RULES[req.mode],
        f"The learner's name is {user.username}. Use it occasionally, not every turn.",
        _topic_context(db, req.topic_slug),
    ])

    async def stream_reply():
        import anthropic

        try:
            async with _get_client().beta.messages.stream(
                model=EDITH_MODEL,
                max_tokens=4000,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                output_config={"effort": "low"},  # conversational turns: favour latency
                system=[{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}],
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                final = await stream.get_final_message()
                if final.stop_reason == "refusal":
                    yield " Sorry, is sawaal pe main help nahi kar sakti. Chalo topic pe wapas aate hain."
        except anthropic.RateLimitError:
            yield f"\n{ERROR_MARKER} EDITH abhi busy hai, ek minute baad try karo."
        except anthropic.APIStatusError as exc:
            logger.error("EDITH API error %s: %s", exc.status_code, exc.message)
            yield f"\n{ERROR_MARKER} EDITH se connect nahi ho paya (API error {exc.status_code})."
        except anthropic.APIConnectionError as exc:
            logger.error("EDITH connection error: %s", exc)
            yield f"\n{ERROR_MARKER} Network issue, dobara try karo."

    return StreamingResponse(stream_reply(), media_type="text/plain; charset=utf-8")
