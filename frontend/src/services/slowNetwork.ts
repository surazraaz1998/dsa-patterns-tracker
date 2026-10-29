// Notice when the API is slow to answer (Render's free tier sleeps when idle and takes up to a minute
// to wake). Wraps fetch once for requests to the API origin and emits 'algotrack:network' events.

export type NetworkState = 'ok' | 'slow';

const SLOW_AFTER_MS = 3000;
let installed = false;

export function installSlowRequestWatcher(apiBase: string) {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    const original = window.fetch.bind(window);
    let inFlight = 0;
    let slowTimer: number | undefined;
    let state: NetworkState = 'ok';

    const emit = (next: NetworkState) => {
        if (next === state) return;
        state = next;
        window.dispatchEvent(new CustomEvent<NetworkState>('algotrack:network', { detail: next }));
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (!url.startsWith(apiBase)) return original(input, init);
        inFlight++;
        if (inFlight === 1) slowTimer = window.setTimeout(() => emit('slow'), SLOW_AFTER_MS);
        try {
            return await original(input, init);
        } finally {
            inFlight--;
            if (inFlight === 0) {
                window.clearTimeout(slowTimer);
                emit('ok');
            }
        }
    };
}
