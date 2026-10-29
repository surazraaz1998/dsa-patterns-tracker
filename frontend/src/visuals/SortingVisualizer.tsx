import React, { useMemo, useState } from 'react';
import { Frame, SORTING_ALGORITHMS } from './sorting';
import { ExampleBar, Legend, VisualShell, useStepper } from './player';

const LEGEND = [
    { label: 'Comparing', className: 'bg-amber-400' },
    { label: 'Swap / write', className: 'bg-rose-500' },
    { label: 'Pivot / current', className: 'bg-fuchsia-500' },
    { label: 'In final place', className: 'bg-emerald-500' },
];

function barColour(frame: Frame, i: number): string {
    if (frame.write?.includes(i)) return 'bg-rose-500';
    if (frame.pivot === i) return 'bg-fuchsia-500'; // keep the pivot visible while others are compared with it
    if (frame.compare?.includes(i)) return 'bg-amber-400';
    if (frame.sorted?.includes(i)) return 'bg-emerald-500';
    return 'bg-sky-500/80';
}

const AuxRows: React.FC<{ frame: Frame }> = ({ frame }) => {
    if (!frame.aux?.length) return null;
    return (
        <div className="space-y-1 text-[11px] font-mono">
            {frame.aux.map((row) => (
                <div key={row.label} className="flex items-center gap-2 min-w-0">
                    <span className="w-24 shrink-0 text-right text-slate-500 truncate">{row.label}</span>
                    <div className="flex flex-wrap gap-1 min-h-[22px]">
                        {row.values.length === 0 && <span className="text-slate-700">—</span>}
                        {row.values.map((v, i) => (
                            <span
                                key={i}
                                className={`min-w-[22px] px-1 py-0.5 text-center rounded border ${
                                    row.highlight === i ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'
                                }`}
                            >
                                {v}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/** Animated, steppable trace of one sorting algorithm with its own input controls. */
export const SortingVisualizer: React.FC<{ algorithm: string }> = ({ algorithm }) => {
    const algo = SORTING_ALGORITHMS[algorithm];
    const [input, setInput] = useState<number[]>(() => algo?.sample() ?? []);
    const frames = useMemo(() => (algo ? algo.run(input) : []), [algo, input]);
    const stepper = useStepper(frames.length);
    const frame = frames[stepper.step];

    if (!algo || !frame) return null;

    const load = (values: number[]) => {
        setInput(values);
        stepper.reset();
    };
    const custom = (text: string) => {
        const values = text.split(/[\s,]+/).filter(Boolean).map(Number);
        const problem = values.some(Number.isNaN) ? 'Use numbers separated by commas.' : algo.validate(values);
        if (!problem) load(values);
        return problem;
    };

    const max = Math.max(...frame.array, 1);
    const showNumbers = frame.array.length <= 16;
    const inRange = (i: number) => !frame.range || (i >= frame.range[0] && i <= frame.range[1]);

    return (
        <VisualShell
            name={algo.name}
            stepper={stepper}
            stats={`${frame.comparisons} comparisons · ${frame.writes} writes`}
            note={frame.note}
            footer={
                <>
                    <ExampleBar hint={algo.inputHint} onRandom={() => load(algo.sample())} onCustom={custom} />
                    <Legend items={frame.range ? [...LEGEND, { label: 'Outside the active part', className: 'bg-sky-500/25' }] : LEGEND} />
                </>
            }
        >
            <div className="flex items-end gap-[3px] h-40 px-1" role="img" aria-label={`Array: ${frame.array.join(', ')}`}>
                {frame.array.map((v, i) => (
                    <div key={i} className={`flex-1 min-w-0 flex flex-col items-center justify-end h-full transition-opacity ${inRange(i) ? '' : 'opacity-25'}`}>
                        {showNumbers && <span className="text-[10px] text-slate-300 font-mono mb-0.5">{v}</span>}
                        <div className={`w-full rounded-t ${barColour(frame, i)} transition-all duration-200`} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
                    </div>
                ))}
            </div>
            <AuxRows frame={frame} />
        </VisualShell>
    );
};
