import React, { useState } from 'react';
import { FaYoutube, FaTimes } from 'react-icons/fa';
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
    const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
    if (clip.start) params.set('start', String(clip.start));
    if (clip.end) params.set('end', String(clip.end));
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.id)}?${params}`;
};

const clipLabel = (clip: VideoClip): string =>
    clip.end ? `${formatTime(clip.end - (clip.start ?? 0))} clip` : 'full video';

/** YouTube buttons for one lesson section; the chosen clip plays inline, limited to its start–end range. */
export const VideoClips: React.FC<{ clips: VideoClip[]; sectionTitle: string }> = ({ clips, sectionTitle }) => {
    const [playing, setPlaying] = useState<number | null>(null);
    const clip = playing === null ? null : clips[playing];

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {clips.map((c, i) => (
                    <button
                        key={`${c.id}-${c.start ?? 0}`}
                        type="button"
                        onClick={() => setPlaying(playing === i ? null : i)}
                        aria-pressed={playing === i}
                        title={`${c.title} — ${c.channel}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                            playing === i
                                ? 'border-red-500/60 bg-red-500/15 text-red-200'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500/50 hover:text-white'
                        }`}
                    >
                        <FaYoutube className="text-red-500 text-sm" aria-hidden />
                        <span>{c.channel}</span>
                        {c.label && <span className="text-slate-400 font-normal">— {c.label}</span>}
                        <span className="text-slate-500 font-normal">· {clipLabel(c)}</span>
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
                        <button type="button" onClick={() => setPlaying(null)} aria-label="Close video" className="shrink-0 text-slate-400 hover:text-white p-0.5">
                            <FaTimes />
                        </button>
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
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
