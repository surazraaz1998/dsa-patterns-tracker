import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCompressAlt, FaExpandAlt, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import { VideoClip } from '../types';
import { embedUrl, formatTime, watchUrl } from './VideoClips';

type Size = 'theater' | 'mini';
type Now = { clip: VideoClip; section: string };
type Player = { now: Now | null; play: (clip: VideoClip, section: string) => void; close: () => void };

const PlayerContext = createContext<Player>({ now: null, play: () => {}, close: () => {} });
export const useVideoPlayer = () => useContext(PlayerContext);

/**
 * One player for the whole app. A clip opens big ("theater", over a dimmed page); shrink it to a corner
 * mini player to keep watching while you read or scroll. Both sizes are the same iframe, so switching
 * doesn't restart the video.
 */
export const VideoPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [now, setNow] = useState<Now | null>(null);
    const [size, setSize] = useState<Size>('theater');
    const play = (clip: VideoClip, section: string) => {
        if (now?.clip !== clip) setNow({ clip, section }); // the same clip again just makes it big
        setSize('theater');
    };
    const close = () => setNow(null);
    return (
        <PlayerContext.Provider value={{ now, play, close }}>
            {children}
            {now && createPortal(<Dock now={now} size={size} onSize={setSize} onClose={close} />, document.body)}
        </PlayerContext.Provider>
    );
};

const Dock: React.FC<{ now: Now; size: Size; onSize: (s: Size) => void; onClose: () => void }> = ({ now, size, onSize, onClose }) => {
    const { clip, section } = now;
    const [loaded, setLoaded] = useState(false);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const theater = size === 'theater';

    useEffect(() => setLoaded(false), [clip]);

    // The iframe's load event fires seconds before YouTube paints the player, so wait for the player's own
    // "ready"/"playing" messages (the IFrame API protocol); give up after 15 s so the overlay never sticks.
    useEffect(() => {
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

    // Esc shrinks the big player to the corner (it doesn't stop it); the page stays still behind the big one.
    useEffect(() => {
        if (!theater) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onSize('mini');
            }
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [theater, onSize]);

    const listen = () => {
        // Ask the player to start sending events to this window.
        frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
    };

    const btn = 'p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10';
    return (
        <div data-theater={theater || undefined}>
            {theater && <button type="button" aria-label="Shrink video" className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm cursor-default" onClick={() => onSize('mini')} />}
            <div
                role={theater ? 'dialog' : 'region'}
                aria-label={`Video: ${clip.title}`}
                className={`fixed z-[61] rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-2xl ${
                    theater
                        ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,calc((100vh-9rem)*16/9),1280px)]'
                        : 'right-3 md:right-5 bottom-20 md:bottom-5 w-[min(72vw,360px)]'
                }`}
            >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 border-b border-slate-800">
                    <p className="flex-1 min-w-0 text-[11px] text-slate-400 truncate">
                        <span className="text-slate-100 font-semibold">{theater ? clip.title : section}</span>
                        {theater && <> · {clip.channel}{clip.end ? ` · plays ${formatTime(clip.start ?? 0)}–${formatTime(clip.end)} (just this part)` : ''}</>}
                    </p>
                    {theater && (
                        <a href={watchUrl(clip)} target="_blank" rel="noreferrer" className={btn} title="Open on YouTube" aria-label="Open on YouTube">
                            <FaExternalLinkAlt size={11} />
                        </a>
                    )}
                    <button type="button" onClick={() => onSize(theater ? 'mini' : 'theater')} className={btn} title={theater ? 'Keep playing in the corner while you read (Esc)' : 'Make it big'} aria-label={theater ? 'Mini player' : 'Big player'}>
                        {theater ? <FaCompressAlt size={12} /> : <FaExpandAlt size={12} />}
                    </button>
                    <button type="button" onClick={onClose} className={btn} title="Close video" aria-label="Close video">
                        <FaTimes size={12} />
                    </button>
                </div>
                <div className="relative w-full aspect-video bg-black">
                    <iframe
                        key={embedUrl(clip)}
                        src={embedUrl(clip)}
                        title={`${section}: ${clip.title}`}
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
        </div>
    );
};
