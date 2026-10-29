# Contributing

The most valuable contribution is **content**: a missing pattern, a better explanation, a question you were actually asked in an interview. All of it lives in [`content/`](content) — you don't need to touch any code.

## Adding or editing questions

Each file in `content/` is one track:

```jsonc
{
  "track": { "id": "system-design", "name": "System Design", "description": "…", "icon": "🏗️", "order": 2 },
  "topics": [
    {
      "slug": "hld-case-studies",            // unique across ALL files, kebab-case, never rename once published
      "name": "HLD Case Studies",
      "description": "One line shown in the sidebar.",
      "revision_note_md": "## Markdown notes…", // EDITH teaches from this, so make it complete
      "items": [
        {
          "title": "Design a distributed rate limiter", // unique within the topic; progress is tracked by title
          "tier": 2,                         // 1 Foundation · 2 Core · 3 Deep dive · 4 Expert
          "url": "https://leetcode.com/problems/…/",   // optional practice link
          "leetcode_number": 146,            // optional
          "hints": ["Nudge 1", "Nudge 2"],
          "explanation": "One or two sentences: the key idea. EDITH uses this to grade spoken answers.",
          "answer_md": "Full model answer in Markdown (theory / design / behavioral).",
          "python": "…", "javascript": "…"   // optional code solutions
        }
      ]
    }
  ]
}
```

### Lessons

A topic can also carry a `lesson`. This is what the app teaches before the practice list. Keep the language simple, as if explaining to a friend who's new to the topic.

```jsonc
"lesson": {
  "status": "full",                 // or "outline" (simple + key_points + resources only)
  "week": "3-4",                    // roadmap weeks, shown as a badge
  "simple": "Markdown: the idea in plain words.",
  "analogy": "One real-life comparison.",
  "concepts": [                     // the "Deep dive": 3-5 sections, Markdown (lists, tables, code)
    {
      "title": "Bubble sort",
      "body": "Explain how it works, why it works, variations and edge cases.",
      "videos": [                     // optional: YouTube buttons that play inside the app
        { "id": "xli_FI7CuzA", "title": "Bubble sort in 2 minutes", "channel": "Michael Sambol" },
        { "id": "HGk_ypEuS24", "title": "Sorting - Part 1 | …", "channel": "take U forward",
          "start": 1552, "end": 1893, "label": "bubble sort part" }   // seconds: plays only this part
      ],
      "visual": { "type": "sorting", "algorithm": "bubble" }          // optional: interactive visualiser
    }
  ],
  "when_to_use": ["How to recognise it in an interview"],
  "dry_run": {
    "title": "Two Sum II on [2, 7, 11, 15]",
    "input": "numbers = [2, 7, 11, 15], target = 9",
    "columns": ["Step", "left", "right", "sum", "Decision"],
    "steps": [["1", "0", "3", "17", "too big → right--"]],
    "takeaway": "Why the trace works, in one line."
  },
  "template": { "python": "…", "javascript": "…" },
  "complexity": "O(n) time, O(1) space.",
  "mistakes": ["…"],
  "interview_tips": ["…"],
  "quiz": [{ "q": "…", "options": ["a", "b", "c", "d"], "answer": 1, "why": "…" }],
  "resources": [{ "label": "…", "url": "https://…" }]
}
```

Turning an outline into a full lesson is the most useful contribution right now (Weeks 17–24). The tests check that every Weeks 1–16 lesson has every section, including at least 3 deep-dive concepts. Write the `simple` intro for a first read and put the depth in `concepts`.

### Videos and visualisers

- **Videos:** use the 11-character YouTube id, the video's real title and channel. When a long video covers several topics, set `start`/`end` (in seconds) from its chapters so the button plays only the relevant part, and add a short `label` ("bubble sort part"). Check the video exists and allows embedding: `curl "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json"` must return its title.
- **Visualisers** live in `frontend/src/visuals/`. Available `type` → `algorithm` values:

  | type | algorithms |
  |---|---|
  | `sorting` | `bubble`, `selection`, `insertion`, `shell`, `merge`, `quick`, `heap`, `counting`, `radix`, `bucket`, `cyclic` |
  | `binary-search` | `classic`, `lower-bound` |
  | `two-pointers` | `two-sum-sorted`, `container` |
  | `sliding-window` | `longest-unique`, `max-sum-k` |
  | `linked-list` | `reverse`, `middle` |
  | `tree` | `preorder`, `inorder`, `postorder`, `levelorder`, `bst-search` |
  | `graph` | `bfs`, `dfs` |
  | `dp` | `climbing-stairs`, `house-robber`, `coin-change`, `lcs` |

  Add `"options": ["preorder", "inorder", …]` to let the viewer switch between variants of the same type. A new visual = a step generator (a pure function returning frames, in `sorting.ts` or `structures.ts`) registered in its table; the shared player (`player.tsx`) provides play/step/speed and the "use my input" box. Update the list in `backend/tests/test_roadmap_and_learning.py` too.
- The tests require **every Weeks 1–16 deep-dive section to have at least one clip**.

### The roadmap

`content/roadmap.json` holds the phases, the two-week blocks and the interview playbook. Each block item lists the `lessons` (topic slugs) it opens. **Never rename an item `id`**, because learners' checkboxes are stored under it.

Guidelines:

- **Write original explanations.** Link to problems; don't copy problem statements or other people's editorials.
- Keep `explanation` short and specific — it's what a good spoken answer should contain.
- Prefer one clear `answer_md` with trade-offs over long essays.
- Don't rename a `slug` or an item `title` that already exists: user progress is keyed on them. Fix typos by adding a new item and removing the old one only if really needed.
- A new JSON file with a new `track.id` automatically becomes a new track in the app.

Check your change:

```bash
cd backend && python3 -m pytest -q   # validates every content file loads and seeds
```

## Code changes

- Backend: FastAPI in `backend/app`. Add a test in `backend/tests` for behaviour changes.
- Frontend: React + TypeScript in `frontend/src`. Run `npm run build` before opening a PR.
- EDITH's prompts live in `backend/app/routes/voice.py`; the offline fallback is `frontend/src/voice/offlineTutor.ts`.

Open a PR with a short description of what you changed and why.
