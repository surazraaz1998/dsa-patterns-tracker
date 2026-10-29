import React, { useEffect, useRef, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import { getPrefs, MotionPref, Prefs, setPrefs, ThemePref } from '../services/prefs';
import { InstallApp } from './InstallApp';

const THEMES: { id: ThemePref; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
];
const MOTION: { id: MotionPref; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'reduce', label: 'Reduce' },
    { id: 'full', label: 'Full' },
];

function Segmented<T extends string>({ label, value, options, onChange }: {
    label: string;
    value: T;
    options: { id: T; label: string }[];
    onChange: (v: T) => void;
}) {
    return (
        <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-slate-300">{label}</legend>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {options.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => onChange(o.id)}
                        aria-pressed={value === o.id}
                        className={`py-2 rounded-lg text-xs font-semibold transition ${value === o.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

/** Theme and motion controls. `inline` renders them directly (mobile drawer); otherwise a gear popover. */
export const SettingsMenu: React.FC<{ inline?: boolean }> = ({ inline }) => {
    const [prefs, setState] = useState<Prefs>(getPrefs);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const update = (next: Partial<Prefs>) => {
        const merged = { ...prefs, ...next };
        setState(merged);
        setPrefs(merged);
    };

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    const controls = (
        <div className="space-y-3">
            <Segmented label="Theme" value={prefs.theme} options={THEMES} onChange={(theme) => update({ theme })} />
            <Segmented label="Motion" value={prefs.motion} options={MOTION} onChange={(motion) => update({ motion })} />
            <InstallApp />
        </div>
    );

    if (inline) return controls;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label="Display settings"
                title="Display settings"
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
                <FaCog size={14} />
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-64 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50">
                    {controls}
                </div>
            )}
        </div>
    );
};
