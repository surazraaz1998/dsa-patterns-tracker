// Pure date helpers for streaks, weekly goals and spaced revision. Dates are local "YYYY-MM-DD" strings.

export const toDay = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = (): string => toDay(new Date());

export function addDays(day: string, n: number): string {
    const [y, m, d] = day.split('-').map(Number);
    return toDay(new Date(y, m - 1, d + n));
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const offset = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
    return addDays(day, -offset);
}

/** Consecutive study days ending today — or yesterday, so the streak isn't "lost" before you study today. */
export function streak(days: string[], on: string = today()): number {
    const set = new Set(days);
    let cursor = set.has(on) ? on : addDays(on, -1);
    let count = 0;
    while (set.has(cursor)) {
        count++;
        cursor = addDays(cursor, -1);
    }
    return count;
}

/** How many of the given dates fall in the same Monday–Sunday week as `on`. */
export function countThisWeek(dates: string[], on: string = today()): number {
    const start = weekStart(on);
    const end = addDays(start, 7);
    return dates.filter((d) => d >= start && d < end).length;
}

// Spaced revision: a recap 3 days after the first quiz, then 7 days after that, then done.
export const REVIEW_GAPS = [3, 7];
export type RevisionState = { due: string | null; step: number }; // step = reviews done so far

export const firstReview = (on: string = today()): RevisionState => ({ due: addDays(on, REVIEW_GAPS[0]), step: 0 });

export function afterReview(state: RevisionState, on: string = today()): RevisionState {
    const step = state.step + 1;
    return step < REVIEW_GAPS.length ? { due: addDays(on, REVIEW_GAPS[step]), step } : { due: null, step };
}

export const isDue = (state: RevisionState | undefined, on: string = today()): boolean => !!state?.due && state.due <= on;
