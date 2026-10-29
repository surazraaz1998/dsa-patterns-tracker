// Display preferences: theme and motion. Stored per device; applied as data attributes on <html>
// (index.html applies them before first paint so there's no flash).

export type ThemePref = 'system' | 'light' | 'dark';
export type MotionPref = 'system' | 'reduce' | 'full';
export type Prefs = { theme: ThemePref; motion: MotionPref };

const KEY = 'algotrack_prefs';
const DEFAULTS: Prefs = { theme: 'system', motion: 'system' };

export function getPrefs(): Prefs {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
        return DEFAULTS;
    }
}

export function applyPrefs(prefs: Prefs = getPrefs()) {
    const root = document.documentElement;
    const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const systemReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.theme = prefs.theme === 'system' ? (systemLight ? 'light' : 'dark') : prefs.theme;
    root.dataset.motion = prefs.motion === 'system' ? (systemReduce ? 'reduce' : 'full') : prefs.motion;
}

export function setPrefs(prefs: Prefs) {
    try {
        localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
        // still applied for this visit
    }
    applyPrefs(prefs);
}

/** Re-apply when the OS setting changes and the user chose "system". */
export function watchSystemPrefs() {
    const reapply = () => applyPrefs();
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', reapply);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', reapply);
}

export const reducedMotion = () => document.documentElement.dataset.motion === 'reduce';

/** Use for every programmatic scroll so "reduce motion" is respected. */
export const smooth = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');
