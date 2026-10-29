import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaStop, FaTimes, FaPaperPlane, FaVolumeUp, FaVolumeMute, FaRedo } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { api, EDITH_ERROR_MARKER, VoiceLanguage, VoiceMessage, VoiceMode } from '../services/api';
import { PatternDetail } from '../types';
import { OfflineTutor } from './offlineTutor';
import { listenOnce, pickVoice, SpeechQueue, speechSupport } from './speech';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
type Line = { role: 'user' | 'assistant'; text: string };

const KICKOFF: Record<VoiceMode, string> = {
    teach: 'Hi EDITH, please start teaching me this topic.',
    test: 'Hi EDITH, start my test on this topic.',
    mock: 'Hi, I am ready for the mock interview.',
};

const MODES: { id: VoiceMode; label: string; hint: string }[] = [
    { id: 'teach', label: 'Teach me', hint: 'Concept samjhao, step by step' },
    { id: 'test', label: 'Test me', hint: '5-question viva with score' },
    { id: 'mock', label: 'Mock interview', hint: 'Real interviewer jaisa (AI mode)' },
];

const STATUS_LABEL: Record<Status, string> = {
    idle: 'Tap the mic and talk',
    listening: 'Sun rahi hoon…',
    thinking: 'Soch rahi hoon…',
    speaking: 'Bol rahi hoon… (tap to interrupt)',
};

type EdithPanelProps = {
    isOpen: boolean;
    onClose: () => void;
    topic: PatternDetail | null;
};

export const EdithPanel: React.FC<EdithPanelProps> = ({ isOpen, onClose, topic }) => {
    const { isAuthenticated } = useAuth();
    const [aiEnabled, setAiEnabled] = useState(false);
    const [mode, setMode] = useState<VoiceMode>('teach');
    const [language, setLanguage] = useState<VoiceLanguage>('hinglish');
    const [lines, setLines] = useState<Line[]>([]);
    const [status, setStatus] = useState<Status>('idle');
    const [interim, setInterim] = useState('');
    const [typed, setTyped] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [handsFree, setHandsFree] = useState(true);
    const [muted, setMuted] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voiceName, setVoiceName] = useState('');
    const [started, setStarted] = useState(false);

    const queue = useRef(new SpeechQueue());
    const history = useRef<VoiceMessage[]>([]);
    const tutor = useRef<OfflineTutor | null>(null);
    const stopListening = useRef<() => void>(() => {});
    const abortStream = useRef<AbortController | null>(null);
    const openRef = useRef(isOpen);
    const handsFreeRef = useRef(handsFree);
    const transcriptEnd = useRef<HTMLDivElement>(null);

    const useAi = aiEnabled && isAuthenticated;
    const effectiveMode: VoiceMode = !useAi && mode === 'mock' ? 'test' : mode;

    openRef.current = isOpen;
    handsFreeRef.current = handsFree;

    useEffect(() => {
        api.getVoiceStatus().then((s) => setAiEnabled(s.ai_enabled)).catch(() => setAiEnabled(false));
    }, []);

    useEffect(() => {
        if (!speechSupport.synthesis()) return;
        const load = () => setVoices(window.speechSynthesis.getVoices());
        load();
        window.speechSynthesis.addEventListener('voiceschanged', load);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }, []);

    useEffect(() => {
        queue.current.voice = pickVoice(language, voiceName || undefined);
    }, [language, voiceName, voices]);

    useEffect(() => {
        queue.current.muted = muted;
        if (muted) queue.current.cancel();
    }, [muted]);

    useEffect(() => {
        transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [lines, interim]);

    const haltEverything = useCallback(() => {
        stopListening.current();
        abortStream.current?.abort();
        queue.current.cancel();
        setStatus('idle');
        setInterim('');
    }, []);

    // Reset the session whenever the panel closes or the topic changes.
    useEffect(() => {
        if (!isOpen) haltEverything();
    }, [isOpen, haltEverything]);
    useEffect(() => {
        haltEverything();
        setLines([]);
        setStarted(false);
        history.current = [];
    }, [topic?.slug, haltEverything]);

    const startListening = useCallback(() => {
        queue.current.cancel();
        setError(null);
        setInterim('');
        setStatus('listening');
        // en-IN recognises Roman-script Hinglish and Indian-accented English well.
        stopListening.current = listenOnce('en-IN', {
            onInterim: setInterim,
            onFinal: (text) => {
                setInterim('');
                void handleUserTurnRef.current(text);
            },
            onError: setError,
            onEnd: () => setStatus((s) => (s === 'listening' ? 'idle' : s)),
        });
    }, [language]);

    const afterEdithSpoke = useCallback(async () => {
        await queue.current.whenIdle();
        if (!openRef.current) return;
        setStatus('idle');
        if (handsFreeRef.current && speechSupport.recognition() && !queue.current.muted) {
            startListening();
        }
    }, [startListening]);

    const say = useCallback((text: string) => {
        setLines((prev) => [...prev, { role: 'assistant', text }]);
        setStatus('speaking');
        queue.current.push(text);
        queue.current.flush();
        void afterEdithSpoke();
    }, [afterEdithSpoke]);

    const askAi = useCallback(async () => {
        setStatus('thinking');
        const ctrl = new AbortController();
        abortStream.current = ctrl;
        setLines((prev) => [...prev, { role: 'assistant', text: '' }]);
        let shown = '';
        try {
            const full = await api.streamVoiceChat(
                { mode: effectiveMode, language, topic_slug: topic?.slug, messages: history.current },
                (chunk) => {
                    if ((shown + chunk).includes(EDITH_ERROR_MARKER)) return;
                    shown += chunk;
                    setStatus('speaking');
                    queue.current.push(chunk);
                    setLines((prev) => [...prev.slice(0, -1), { role: 'assistant', text: shown }]);
                },
                ctrl.signal,
            );
            queue.current.flush();
            const markerAt = full.indexOf(EDITH_ERROR_MARKER);
            if (markerAt >= 0) {
                setError(full.slice(markerAt + EDITH_ERROR_MARKER.length).trim());
                history.current.pop(); // let the user retry the same turn
                if (!shown.trim()) setLines((prev) => prev.slice(0, -1));
                setStatus('idle');
                return;
            }
            history.current.push({ role: 'assistant', content: full });
            void afterEdithSpoke();
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            history.current.pop();
            setLines((prev) => (prev[prev.length - 1]?.text ? prev : prev.slice(0, -1)));
            setError(err instanceof Error ? err.message : 'EDITH could not reply');
            setStatus('idle');
        }
    }, [effectiveMode, language, topic?.slug, afterEdithSpoke]);

    const handleUserTurn = useCallback(async (text: string) => {
        const clean = text.trim();
        if (!clean) return;
        stopListening.current();
        queue.current.cancel();
        setLines((prev) => [...prev, { role: 'user', text: clean }]);
        if (useAi) {
            history.current.push({ role: 'user', content: clean });
            await askAi();
        } else if (tutor.current) {
            say(tutor.current.reply(clean));
        }
    }, [useAi, askAi, say]);

    // listenOnce callbacks outlive renders; route them to the latest handler.
    const handleUserTurnRef = useRef(handleUserTurn);
    handleUserTurnRef.current = handleUserTurn;

    const startSession = async () => {
        if (!topic) return;
        haltEverything();
        setError(null);
        setLines([]);
        setStarted(true);
        history.current = [];
        if (useAi) {
            history.current.push({ role: 'user', content: KICKOFF[effectiveMode] });
            await askAi();
        } else {
            tutor.current = new OfflineTutor(topic, effectiveMode);
            say(tutor.current.start());
        }
    };

    const onMicClick = () => {
        if (!started) {
            void startSession();
        } else if (status === 'listening') {
            stopListening.current();
        } else if (status === 'speaking' || status === 'thinking') {
            abortStream.current?.abort();
            queue.current.cancel();
            startListening();
        } else {
            startListening();
        }
    };

    const onTypedSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!typed.trim()) return;
        if (!started) {
            setTyped('');
            void startSession();
            return;
        }
        void handleUserTurn(typed);
        setTyped('');
    };

    if (!isOpen) return null;

    const indianVoices = voices.filter((v) => /-(IN)$/i.test(v.lang.replace('_', '-')));
    const voiceOptions = indianVoices.length > 0 ? indianVoices : voices.filter((v) => v.lang.startsWith('en'));

    return (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-950/90 backdrop-blur-md sm:p-4" onClick={onClose}>
            <div
                className="relative w-full sm:max-w-2xl h-full sm:h-[88vh] bg-slate-900 sm:border border-slate-800 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-5 pb-3 border-b border-slate-800">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">EDITH</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${useAi ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                {useAi ? 'AI mode' : 'Offline mode'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{topic ? topic.name : 'Pick a topic first'}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close EDITH" className="w-8 h-8 shrink-0 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                        <FaTimes size={14} />
                    </button>
                </div>

                {/* Settings */}
                <div className="px-4 sm:px-6 py-3 border-b border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2">
                        {MODES.map((m) => {
                            const disabled = m.id === 'mock' && !useAi;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => { setMode(m.id); setStarted(false); haltEverything(); setLines([]); }}
                                    title={disabled ? 'Sign in (with AI enabled on the server) for mock interviews' : m.hint}
                                    className={`px-2 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                                        mode === m.id
                                            ? 'bg-fuchsia-600/20 border-fuchsia-500/60 text-white'
                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    {m.label}
                                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">{m.hint}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200"
                            aria-label="Language"
                        >
                            <option value="hinglish">Hinglish</option>
                            <option value="english">English</option>
                        </select>
                        {voiceOptions.length > 0 && (
                            <select
                                value={voiceName}
                                onChange={(e) => setVoiceName(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 max-w-[11rem]"
                                aria-label="Voice"
                            >
                                <option value="">Auto voice</option>
                                {voiceOptions.map((v) => (
                                    <option key={v.name} value={v.name}>{v.name}</option>
                                ))}
                            </select>
                        )}
                        <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="accent-fuchsia-500" />
                            Hands-free
                        </label>
                        <button type="button" onClick={() => setMuted((m) => !m)} className="ml-auto inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white">
                            {muted ? <FaVolumeMute /> : <FaVolumeUp />} {muted ? 'Muted' : 'Sound'}
                        </button>
                    </div>
                    {!useAi && (
                        <p className="text-[11px] text-slate-500">
                            {isAuthenticated
                                ? 'AI mode needs ANTHROPIC_API_KEY on the server — using the offline script for now.'
                                : 'Offline script mode. Sign in for the full AI tutor that answers your doubts and runs mock interviews.'}
                        </p>
                    )}
                </div>

                {/* Transcript */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                    {lines.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                            <p className="text-sm font-semibold text-slate-200">Namaste! Main EDITH hoon.</p>
                            <p className="text-xs max-w-sm">
                                Mic dabao aur session start karo. Main {mode === 'teach' ? 'topic samjhaungi' : mode === 'test' ? 'aapka test lungi' : 'interviewer banungi'} — normal baat-cheet jaisa, Hinglish mein.
                            </p>
                        </div>
                    )}
                    {lines.map((line, i) => (
                        <div key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                line.role === 'user' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-100 rounded-bl-md'
                            }`}>
                                {line.text || <span className="animate-pulse text-slate-400">…</span>}
                            </div>
                        </div>
                    ))}
                    {interim && (
                        <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm bg-indigo-600/40 text-indigo-100 italic">{interim}</div>
                        </div>
                    )}
                    <div ref={transcriptEnd} />
                </div>

                {error && (
                    <div className="mx-4 sm:mx-6 mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">{error}</div>
                )}

                {/* Controls */}
                <div className="border-t border-slate-800 px-4 sm:px-6 py-4 space-y-3">
                    <div className="flex items-center justify-center gap-4">
                        {started && (
                            <button type="button" onClick={() => void startSession()} title="Restart session" className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center">
                                <FaRedo size={13} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onMicClick}
                            disabled={!topic}
                            aria-label={status === 'listening' ? 'Stop listening' : 'Talk to EDITH'}
                            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition ${
                                status === 'listening'
                                    ? 'bg-rose-600 shadow-rose-500/40'
                                    : status === 'speaking'
                                    ? 'bg-fuchsia-600 shadow-fuchsia-500/40'
                                    : 'bg-gradient-to-br from-fuchsia-600 to-indigo-600 shadow-indigo-500/30'
                            } disabled:opacity-40`}
                        >
                            {(status === 'listening' || status === 'speaking') && (
                                <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                            )}
                            {status === 'listening' ? <FaStop size={22} /> : <FaMicrophone size={26} />}
                        </button>
                        {started && status !== 'idle' && (
                            <button type="button" onClick={haltEverything} title="Stop" className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center">
                                <FaStop size={12} />
                            </button>
                        )}
                    </div>
                    <p className="text-center text-xs text-slate-400">{started ? STATUS_LABEL[status] : 'Tap the mic to start the session'}</p>
                    <form onSubmit={onTypedSubmit} className="flex gap-2">
                        <input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={started ? 'Ya yahan type karo…' : 'Type anything to start…'}
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
                        />
                        <button type="submit" disabled={!topic} aria-label="Send" className="px-3.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40">
                            <FaPaperPlane size={13} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
