// Ranking for the search palette. Every query word must match. Match quality decides first (the phrase at the
// start of a title > the phrase inside a title > all words somewhere in a title > only in a lesson's description);
// the result kind only breaks ties (lesson > section > problem).
import type { SearchItem } from './api';

export type SearchResult = {
    kind: 'lesson' | 'section' | 'problem';
    slug: string;
    track: string;
    title: string;
    lessonName: string;
    score: number;
};

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, ' ');

function scoreText(text: string, words: string[]): number {
    const t = norm(text);
    if (!words.every((w) => t.includes(w))) return 0;
    const phrase = words.join(' ');
    return t.startsWith(phrase) ? 30 : t.includes(phrase) ? 20 : 10;
}

const KIND_BONUS = { lesson: 3, section: 2, problem: 1 } as const;

export function search(index: SearchItem[], query: string, limit = 30): SearchResult[] {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const results: SearchResult[] = [];
    const add = (kind: SearchResult['kind'], item: SearchItem, title: string, quality: number) =>
        results.push({ kind, slug: item.slug, track: item.track, title, lessonName: item.name, score: quality + KIND_BONUS[kind] + (item.status === 'full' ? 0.5 : 0) });
    for (const item of index) {
        const name = scoreText(item.name, words) || (scoreText(item.description, words) ? 4 : 0);
        if (name) add('lesson', item, item.name, name);
        for (const section of item.sections) {
            const q = scoreText(section, words);
            if (q) add('section', item, section, q);
        }
        for (const problem of item.problems) {
            const q = scoreText(problem, words);
            if (q) add('problem', item, problem, q);
        }
    }
    return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
