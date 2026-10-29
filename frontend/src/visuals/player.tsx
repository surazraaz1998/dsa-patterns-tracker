import React, { useEffect, useState } from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaRedo, FaRandom } from 'react-icons/fa';

const SPEEDS = [
    { label: 'Slow', ms: 1100 },
    { label: 'Normal', ms: 550 },
    { label: 'Fast', ms: 200 },
];

export type Stepper = ReturnType<typeof useStepper>;

/** Playback state for a list of frames: current step, play/pause and speed. */
export function useStepper(count: number) {
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const atEnd = step >= count - 1;

    useEffect(() => {
        if (!playing) return;
        if (atEnd) {
            setPlaying(false);
            return;
        }
        const t = window.setTimeout(() => setStep((s) => s + 1), SPEEDS[speed].ms);
        return () => window.clearTimeout(t);
    }, [playing, step, atEnd, speed]);

    return {
        step: Math.min(step, Math.max(0, count - 1)),
        count,
        playing,
        atEnd,
        speed,
        setSpeed,
        reset: () => { setStep(0); setPlaying(false); },
        toggle: () => { if (atEnd) setStep(0); setPlaying((p) => !p); },
        back: () => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); },
        forward: () => { setPlaying(false); setStep((s) => Math.min(count - 1, s + 1)); },
        seek: (s: number) => { setPlaying(false); setStep(s); },
    };
}

const btn = 'p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800';

export const StepControls: React.FC<{ stepper: Stepper }> = ({ stepper: s }) => (
    <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={s.reset} disabled={s.step === 0} aria-label="Back to start"><FaRedo size={12} /></button>
        <button type="button" className={btn} onClick={s.back} disabled={s.step === 0} aria-label="Previous step"><FaStepBackward size={12} /></button>
        <button type="button" onClick={s.toggle} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5">
            {s.playing ? <><FaPause size={11} /> Pause</> : <><FaPlay size={11} /> {s.atEnd ? 'Replay' : 'Play'}</>}
        </button>
        <button type="button" className={btn} onClick={s.forward} disabled={s.atEnd} aria-label="Next step"><FaStepForward size={12} /></button>
        <input
            type="range"
            min={0}
            max={Math.max(0, s.count - 1)}
            value={s.step}
            onChange={(e) => s.seek(Number(e.target.value))}
            aria-label="Jump to step"
            className="flex-1 min-w-[80px] accent-indigo-500"
        />
        <select value={s.speed} onChange={(e) => s.setSpeed(Number(e.target.value))} aria-label="Speed" className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-2 border border-slate-700">
            {SPEEDS.map((sp, i) => <option key={sp.label} value={i}>{sp.label}</option>)}
        </select>
    </div>
);

/** "New example" + "use my input" bar. onCustom returns an error message, or null when accepted. */
export const ExampleBar: React.FC<{ hint: string; onRandom: () => void; onCustom: (text: string) => string | null }> = ({ hint, onRandom, onCustom }) => {
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); setError(onCustom(text)); }}
            className="flex flex-wrap items-center gap-1.5"
        >
            <button type="button" onClick={() => { setError(null); onRandom(); }} className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-indigo-500 inline-flex items-center gap-1.5">
                <FaRandom size={10} /> New example
            </button>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={hint}
                aria-label="Your own input"
                className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
            />
            <button type="submit" className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700">Use mine</button>
            {error && <p className="w-full text-[11px] text-rose-300">{error}</p>}
        </form>
    );
};

export const Legend: React.FC<{ items: { label: string; className: string }[] }> = ({ items }) => (
    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
        {items.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${l.className}`} />{l.label}</span>
        ))}
    </div>
);

/** Frame around every visualiser: title, step counter, picture, explanation, controls. */
export const VisualShell: React.FC<{
    name: string;
    stepper: Stepper;
    stats?: string;
    note: string;
    children: React.ReactNode;
    footer: React.ReactNode;
}> = ({ name, stepper, stats, note, children, footer }) => (
    <div className="rounded-2xl border border-indigo-500/25 bg-slate-950/80 p-3 md:p-4 space-y-3" aria-label={`${name} visualisation`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Watch it run · {name}</p>
            <p className="text-[11px] text-slate-400 font-mono">step {stepper.step + 1}/{stepper.count}{stats ? ` · ${stats}` : ''}</p>
        </div>
        {children}
        <p className="text-sm text-slate-100 min-h-[2.5rem] leading-snug" aria-live="polite">{note}</p>
        <StepControls stepper={stepper} />
        {footer}
    </div>
);
