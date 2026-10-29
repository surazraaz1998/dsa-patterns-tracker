// Per-device study memory: the last lesson opened and where you were in each lesson.
// Kept in localStorage only (it's about this screen, not your account); every access is guarded
// because storage can be blocked or full.

export type LastLesson = { slug: string; trackId: string; name: string; at: number };
export type SavedSpot = { y: number; section?: string };

const LAST_KEY = 'algotrack_last_lesson';
const SPOTS_KEY = 'algotrack_lesson_spots';
const MAX_SPOTS = 60;

function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function write(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore — this is a convenience only
    }
}

export const getLastLesson = (): LastLesson | null => read<LastLesson | null>(LAST_KEY, null);

export const setLastLesson = (lesson: Omit<LastLesson, 'at'>) => write(LAST_KEY, { ...lesson, at: Date.now() });

export const getSpot = (slug: string): SavedSpot | null => read<Record<string, SavedSpot>>(SPOTS_KEY, {})[slug] ?? null;

export function saveSpot(slug: string, spot: SavedSpot | null) {
    const spots = read<Record<string, SavedSpot & { t?: number }>>(SPOTS_KEY, {});
    if (spot) spots[slug] = { ...spot, t: Date.now() };
    else delete spots[slug];
    // keep the most recent few dozen lessons
    const keep = Object.entries(spots).sort((a, b) => (b[1].t ?? 0) - (a[1].t ?? 0)).slice(0, MAX_SPOTS);
    write(SPOTS_KEY, Object.fromEntries(keep));
}
