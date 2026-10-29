import React, { useEffect, useState } from 'react';
import { NetworkState } from '../services/slowNetwork';

/** Shown while API requests take longer than a few seconds — usually the free server waking up. */
export const ServerWakeBanner: React.FC = () => {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        const onChange = (e: Event) => setSlow((e as CustomEvent<NetworkState>).detail === 'slow');
        window.addEventListener('algotrack:network', onChange);
        return () => window.removeEventListener('algotrack:network', onChange);
    }, []);

    if (!slow) return null;
    return (
        <div role="status" className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-3">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <span className="mt-1 w-3.5 h-3.5 shrink-0 rounded-full border-2 border-amber-300/30 border-t-amber-300 animate-spin" />
                <p>
                    <strong className="text-amber-200">Waking up the server…</strong> The free server sleeps when nobody's using it, so the first
                    load can take up to a minute. Everything after that is fast.
                </p>
            </div>
        </div>
    );
};
