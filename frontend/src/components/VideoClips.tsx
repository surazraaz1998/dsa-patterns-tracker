import React, { useEffect, useRef, useState } from 'react';
import { FaYoutube, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import { VideoClip } from '../types';

export const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const mm = h ? String(m).padStart(2, '0') : String(m);
    return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
};

// youtube-nocookie avoids tracking cookies until the viewer presses play.
export const embedUrl = (clip: VideoClip): string => {
    // enablejsapi + origin let the player tell us (via postMessage) when it's actually ready.
    const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1', enablejsapi: '1', origin: window.location.origin });
    if (clip.start) params.set('start', String(clip.start));
    if (clip.end) params.set('end', String(clip.end));
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.id)}?${params}`;
};

const clipLabel = (clip: VideoClip): string =>
    clip.end ? `${formatTime(clip.end - (clip.start ?? 0))} clip` : 'full video';

// Without a label, show the start of the title so two clips from one channel are distinguishable on touch screens.
const shortTitle = (title: string, max = 38): string => {
    const head = title.split(/\s[|•–-]\s/)[0].trim();
    return head.length > max ? `${head.slice(0, max - 1).trimEnd()}…` : head;
};

const watchUrl = (clip: VideoClip): string =>
    `https://www.youtube.com/watch?v=${encodeURIComponent(clip.id)}${clip.start ? `&t=${clip.start}s` : ''}`;

/** YouTube buttons for one lesson section; the chosen clip plays inline, limited to its start–end range. */
export const VideoClips: React.FC<{ clips: VideoClip[]; sectionTitle: string }> = ({ clips, sectionTitle }) => {
    const [playing, setPlaying] = useState<number | null>(null);
    const [loaded, setLoaded] = useState(false);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const clip = playing === null ? null : clips[playing];
    const choose = (i: number) => {
        setLoaded(false);
        setPlaying(playing === i ? null : i);
    };

    // The iframe's load event fires seconds before YouTube paints the player, so wait for the player's own
    // "ready"/"playing" messages (the IFrame API protocol); give up after 15 s so the overlay never sticks.
    useEffect(() => {
        if (!clip) return;
        const onMessage = (e: MessageEvent) => {
            if (e.source !== frameRef.current?.contentWindow || typeof e.data !== 'string') return;
            try {
                const msg = JSON.parse(e.data);
                if (msg.event === 'onReady' || (msg.event === 'infoDelivery' && msg.info?.playerState !== undefined)) setLoaded(true);
            } catch {
                /* not a player message */
            }
        };
        window.addEventListener('message', onMessage);
        const fallback = window.setTimeout(() => setLoaded(true), 15000);
        return () => {
            window.removeEventListener('message', onMessage);
            window.clearTimeout(fallback);
        };
    }, [clip]);

    const listen = () => {
        // Ask the player to start sending events to this window.
        frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {clips.map((c, i) => (
                    <button
                        key={`${c.id}-${c.start ?? 0}`}
                        type="button"
                        onClick={() => choose(i)}
                        aria-pressed={playing === i}
                        title={`${c.title} — ${c.channel}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition text-left max-w-full ${
                            playing === i
                                ? 'border-red-500/60 bg-red-500/15 text-red-200'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500/50 hover:text-white'
                        }`}
                    >
                        <FaYoutube className="text-red-500 text-sm shrink-0" aria-hidden />
                        <span className="min-w-0">
                            <span>{c.channel}</span>
                            <span className="text-slate-400 font-normal"> — {c.label ?? shortTitle(c.title)}</span>
                            <span className="text-slate-500 font-normal"> · {clipLabel(c)}</span>
                        </span>
                    </button>
                ))}
            </div>
            {clip && (
                <div className="rounded-xl border border-slate-800 bg-black/40 overflow-hidden">
                    <div className="flex items-start justify-between gap-2 px-3 py-2 text-[11px] text-slate-400">
                        <span className="min-w-0">
                            <span className="text-slate-200 font-semibold">{clip.title}</span>
                            {' · '}{clip.channel}
                            {clip.end ? ` · plays ${formatTime(clip.start ?? 0)}–${formatTime(clip.end)} (only this part)` : ''}
                        </span>
                        <span className="shrink-0 flex items-center gap-2">
                            <a href={watchUrl(clip)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-400 hover:text-white" title="Open on YouTube">
                                <FaExternalLinkAlt size={10} /> <span className="hidden sm:inline">YouTube</span>
                            </a>
                            <button type="button" onClick={() => setPlaying(null)} aria-label="Close video" className="text-slate-400 hover:text-white p-0.5">
                                <FaTimes />
                            </button>
                        </span>
                    </div>
                    <div className="relative w-full aspect-video">
                        <iframe
                            key={embedUrl(clip)}
                            src={embedUrl(clip)}
                            title={`${sectionTitle}: ${clip.title}`}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            ref={frameRef}
                            onLoad={listen}
                        />
                        {!loaded && (
                            // The player can take several seconds to appear; show the thumbnail meanwhile.
                            <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none" aria-live="polite">
                                <img src={`https://i.ytimg.com/vi/${encodeURIComponent(clip.id)}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                <span className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 text-xs text-white">
                                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Loading video…
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
