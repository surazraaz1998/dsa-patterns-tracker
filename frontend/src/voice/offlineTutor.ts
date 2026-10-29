// Scripted EDITH used when the AI mode isn't available (guest users, or no
// ANTHROPIC_API_KEY on the server). It teaches from the topic's revision notes
// and quizzes from its questions, entirely in the browser.

import { PatternDetail, Problem } from '../types';
import { VoiceMode } from '../services/api';
import { toSpeakable } from './speech';

const STOPWORDS = new Set(
    'the a an and or of to in on for with is are be by it this that as at from use using we you your our can into then than when which will each one two hai hain ka ki ke ko se mein me aur toh ye yeh kya nahi bhi par'.split(' '),
);

function keywords(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    );
}

function chunkNotes(markdown: string): string[] {
    return markdown
        .split(/\n(?=#{1,6}\s)|\n\s*\n/)
        .map((block) => toSpeakable(block.replace(/^#{1,6}\s*/gm, '').replace(/^\s*[-\d.]+\s+/gm, '')))
        .filter((block) => block.length > 20);
}

const NEXT_WORDS = /\b(next|aage|haan|ha|yes|ok|okay|samjha|samajh|got it|continue|chalo)\b/i;
const REPEAT_WORDS = /\b(repeat|dobara|phir se|again|samajh nahi|nahi samjha|didn'?t get)\b/i;

export class OfflineTutor {
    private chunks: string[];
    private questions: Problem[];
    private step = 0;
    private score = 0;
    private awaitingAnswer = false;

    constructor(private topic: PatternDetail, private mode: VoiceMode) {
        this.chunks = chunkNotes(topic.revision_note_md || topic.description);
        this.questions = Object.values(topic.problems_by_tier || {}).flat().slice(0, 5);
    }

    start(): string {
        if (this.mode === 'teach') {
            return `Namaste! Main EDITH hoon, offline mode mein. Aaj hum ${this.topic.name} padhenge. Main thoda thoda samjhaungi, aap "next" bolo aage badhne ke liye, ya "repeat" dobara sunne ke liye. ${this.teachStep()}`;
        }
        if (this.questions.length === 0) return `${this.topic.name} mein abhi koi questions nahi hain. Teach mode try karo.`;
        return `Chalo ${this.topic.name} ka quick test lete hain. ${this.questions.length} questions honge. Har question ka approach apne words mein batao. ${this.askQuestion()}`;
    }

    reply(userText: string): string {
        return this.mode === 'teach' ? this.handleTeach(userText) : this.handleTest(userText);
    }

    private teachStep(): string {
        const chunk = this.chunks[this.step];
        if (!chunk) return 'Bas, ye topic complete! Ab test mode mein jaake check karo kitna yaad hai.';
        return `${chunk} ... Samajh aaya? Next bolo.`;
    }

    private handleTeach(text: string): string {
        if (REPEAT_WORDS.test(text)) return `Theek hai, phir se sunte hain. ${this.teachStep()}`;
        if (NEXT_WORDS.test(text) || text.trim().length < 3) {
            this.step++;
            return this.teachStep();
        }
        return `Accha sawaal hai! Offline mode mein main detail mein jawab nahi de sakti — sign in karke AI mode use karo. Abhi ke liye: ${this.teachStep()}`;
    }

    private askQuestion(): string {
        const q = this.questions[this.step];
        this.awaitingAnswer = true;
        return `Question ${this.step + 1}: ${q.title}. Isme aap kaunsa approach lagaoge?`;
    }

    private handleTest(text: string): string {
        if (!this.awaitingAnswer) return 'Test khatam ho gaya. Dobara start karne ke liye restart dabao.';
        const q = this.questions[this.step];
        const expected = [q.guide?.explanation, ...(q.guide?.hints || [])].filter(Boolean).join(' ');
        const expectedWords = keywords(expected);
        const said = keywords(text);
        const overlap = [...said].filter((w) => expectedWords.has(w)).length;
        const good = expectedWords.size > 0 && (overlap >= 3 || overlap / expectedWords.size >= 0.2);
        if (good) this.score++;

        const feedback = good ? 'Badhiya, sahi direction hai!' : 'Hmm, thoda miss hua.';
        const keyIdea = toSpeakable(q.guide?.explanation || q.guide?.hints?.[0] || '');
        let response = `${feedback} Key idea ye hai: ${keyIdea}`;

        this.step++;
        if (this.step < this.questions.length) {
            response += ` ... ${this.askQuestion()}`;
        } else {
            this.awaitingAnswer = false;
            response += ` ... Test complete! Aapka score: ${this.score} out of ${this.questions.length}. ${
                this.score === this.questions.length ? 'Zabardast!' : 'Jo miss hue, unke hints dobara padh lo.'
            }`;
        }
        return response;
    }
}
