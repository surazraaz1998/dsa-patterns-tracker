import React from 'react';
import { FaPlay, FaYoutube } from 'react-icons/fa';
import { VideoClip } from '../types';
import { useVideoPlayer } from './VideoPlayer';

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

export const watchUrl = (clip: VideoClip): string =>
    `https://www.youtube.com/watch?v=${encodeURIComponent(clip.id)}${clip.start ? `&t=${clip.start}s` : ''}`;

/** YouTube buttons for one lesson section; the chosen clip opens in the app's big player, limited to its start–end range. */
export const VideoClips: React.FC<{ clips: VideoClip[]; sectionTitle: string }> = ({ clips, sectionTitle }) => {
    const { now, play } = useVideoPlayer();
    return (
        <div className="flex flex-wrap gap-1.5">
            {clips.map((c) => {
                const playing = now?.clip === c;
                return (
                    <button
                        key={`${c.id}-${c.start ?? 0}`}
                        type="button"
                        onClick={() => play(c, sectionTitle)}
                        aria-pressed={playing}
                        title={`${c.title} — ${c.channel}`}
                        className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border text-xs font-semibold transition text-left max-w-full ${
                            playing
                                ? 'border-red-500/60 bg-red-500/15 text-red-200'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500/50 hover:text-white'
                        }`}
                    >
                        <span className="relative shrink-0 w-16 aspect-video rounded-md overflow-hidden bg-black">
                            <img src={`https://i.ytimg.com/vi/${encodeURIComponent(c.id)}/mqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover opacity-80" />
                            <FaPlay className="absolute inset-0 m-auto text-white drop-shadow" size={10} aria-hidden />
                        </span>
                        <span className="min-w-0">
                            <span className="flex items-center gap-1"><FaYoutube className="text-red-500 shrink-0" aria-hidden />{c.channel}</span>
                            <span className="block text-slate-400 font-normal">{c.label ?? shortTitle(c.title)} · {playing ? 'playing' : clipLabel(c)}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
