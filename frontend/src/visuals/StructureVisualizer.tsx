import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrayFrame, Frame, GraphFrame, ListFrame, TableFrame, Tone, TreeFrame, VISUALS } from './structures';
import { ExampleBar, Legend, VisualShell, useStepper } from './player';
import { smooth } from '../services/prefs';

const CELL: Record<Tone | 'idle', string> = {
    idle: 'bg-slate-800 text-slate-100 border-slate-600',
    compare: 'bg-amber-400 text-slate-950 border-amber-300',
    found: 'bg-emerald-500 text-white border-emerald-200 ring-2 ring-emerald-300/70',
    best: 'bg-emerald-500 text-white border-emerald-200',
    bad: 'bg-rose-500 text-white border-rose-300',
    done: 'bg-emerald-700/70 text-white border-emerald-500',
};
const FILL: Record<Tone | 'idle', string> = {
    idle: '#1e293b', compare: '#fbbf24', found: '#10b981', best: '#10b981', bad: '#f43f5e', done: '#047857',
};

const LEGENDS: Record<Frame['kind'], { label: string; className: string }[]> = {
    array: [
        { label: 'Looking at', className: 'bg-amber-400' },
        { label: 'Ruled out / repeat', className: 'bg-rose-500' },
        { label: 'Answer', className: 'bg-emerald-500' },
        { label: 'Active range', className: 'border border-indigo-400 bg-indigo-500/20' },
    ],
    list: [
        { label: 'Working on', className: 'bg-amber-400' },
        { label: 'Pointer just flipped', className: 'bg-rose-500' },
        { label: 'Done', className: 'bg-emerald-700' },
    ],
    tree: [
        { label: 'Current node', className: 'border-2 border-fuchsia-400' },
        { label: 'Compared', className: 'bg-amber-400' },
        { label: 'Visited / found', className: 'bg-emerald-600' },
    ],
    graph: [
        { label: 'Current node', className: 'border-2 border-fuchsia-400' },
        { label: 'Waiting (queue / stack)', className: 'bg-amber-400' },
        { label: 'Visited', className: 'bg-emerald-600' },
        { label: 'Edge being checked', className: 'bg-amber-300' },
    ],
    table: [
        { label: 'Cell being filled', className: 'bg-amber-400' },
        { label: 'Cells it uses', className: 'bg-sky-500' },
    ],
};

const Aux: React.FC<{ aux?: { label: string; value: string }[] }> = ({ aux }) =>
    aux?.length ? (
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[11px] font-mono">
            {aux.map((a) => (
                <React.Fragment key={a.label}>
                    <dt className="text-slate-400 text-right">{a.label}</dt>
                    <dd className="text-slate-200 break-words min-w-0">{a.value}</dd>
                </React.Fragment>
            ))}
        </dl>
    ) : null;

/** Scroll a horizontally overflowing row so the element marked data-focus stays visible (never scrolls the page). */
function useKeepInView(dep: unknown) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const box = ref.current;
        const el = box?.querySelector<HTMLElement>('[data-focus="true"]');
        if (!box || !el || box.scrollWidth <= box.clientWidth) return;
        const b = box.getBoundingClientRect(), e = el.getBoundingClientRect();
        if (e.left < b.left + 8 || e.right > b.right - 8) {
            box.scrollTo({ left: box.scrollLeft + (e.left - b.left) - b.width / 2 + e.width / 2, behavior: smooth() });
        }
    }, [dep]);
    return ref;
}

const ArrayView: React.FC<{ f: ArrayFrame }> = ({ f }) => {
    const slots = f.pointers.some((p) => p.index >= f.items.length) ? f.items.length + 1 : f.items.length;
    const inWindow = (i: number) => !f.window || (i >= f.window[0] && i <= f.window[1]);
    const max = f.bars ? Math.max(...(f.items as number[]), 1) : 1;
    const focus = f.pointers.length ? f.pointers[f.pointers.length - 1].index : -1;
    const ref = useKeepInView(f);
    return (
        <div ref={ref} className="overflow-x-auto">
            <div className="flex gap-1 min-w-max mx-auto w-fit px-1">
                {Array.from({ length: slots }, (_, i) => {
                    const isEnd = i === f.items.length;
                    const tone = f.tones?.[i] ?? 'idle';
                    const labels = f.pointers.filter((p) => p.index === i).map((p) => p.label);
                    return (
                        <div key={i} data-focus={i === focus} className={`flex flex-col items-center gap-1 transition-opacity ${isEnd || inWindow(i) ? '' : 'opacity-30'}`}>
                            <span className="text-[9px] text-slate-400 font-mono">{isEnd ? 'end' : i}</span>
                            {f.bars && !isEnd ? (
                                <div className="h-28 w-7 [.vis-expanded_&]:h-[40vh] [.vis-expanded_&]:w-10 flex flex-col justify-end items-center">
                                    <span className="text-[10px] text-slate-300 font-mono">{f.items[i]}</span>
                                    <div className={`w-full rounded-t border ${CELL[tone]} ${f.window && inWindow(i) && tone === 'idle' ? 'border-indigo-400' : ''}`} style={{ height: `${Math.max(6, ((f.items[i] as number) / max) * 100)}%` }} />
                                </div>
                            ) : (
                                <div className={`w-8 h-8 [.vis-expanded_&]:w-12 [.vis-expanded_&]:h-12 [.vis-expanded_&]:text-base rounded-md border flex items-center justify-center text-xs font-mono font-semibold transition-colors ${
                                    isEnd ? 'border-dashed border-slate-700 text-slate-600' : CELL[tone]} ${f.window && inWindow(i) && tone === 'idle' && !isEnd ? 'border-indigo-400 bg-indigo-500/20' : ''}`}>
                                    {isEnd ? '·' : f.items[i]}
                                </div>
                            )}
                            <div className="min-h-[28px] flex flex-col items-center">
                                {labels.map((l) => <span key={l} className="text-[10px] font-bold text-indigo-300 leading-tight">↑{l}</span>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ListView: React.FC<{ f: ListFrame }> = ({ f }) => {
    const focus = f.pointers.find((p) => p.index !== null)?.index ?? -1;
    const ref = useKeepInView(f);
    return (
        <div ref={ref} className="overflow-x-auto">
            <div className="flex items-start min-w-max mx-auto w-fit px-1 py-1">
                {f.values.map((v, i) => {
                    const labels = f.pointers.filter((p) => p.index === i).map((p) => p.label);
                    const tone = f.tones?.[i] ?? 'idle';
                    const right = f.next[i] === i + 1;
                    const left = i + 1 < f.values.length && f.next[i + 1] === i;
                    return (
                        <React.Fragment key={i}>
                            <div className="flex flex-col items-center gap-1" data-focus={i === focus}>
                                <div className={`w-11 [.vis-expanded_&]:w-16 [.vis-expanded_&]:text-base rounded-md border text-center transition-colors ${CELL[tone]}`}>
                                    <div className="text-sm font-mono font-semibold py-1">{v}</div>
                                    <div className="text-[9px] border-t border-current/20 opacity-80 py-0.5">{f.next[i] === null ? 'next ∅' : `next ${f.values[f.next[i]!]}`}</div>
                                </div>
                                <div className="min-h-[28px] flex flex-col items-center">
                                    {labels.map((l) => <span key={l} className="text-[10px] font-bold text-indigo-300 leading-tight">↑{l}</span>)}
                                </div>
                            </div>
                            {i + 1 < f.values.length && (
                                <div className="w-6 h-9 flex items-center justify-center text-base text-slate-400" aria-hidden>
                                    {right ? '→' : left ? '←' : ' '}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            {f.pointers.some((p) => p.index === null) && (
                <p className="text-[10px] text-slate-400 text-center">{f.pointers.filter((p) => p.index === null).map((p) => `${p.label} = null`).join(' · ')}</p>
            )}
        </div>
    );
};

const TreeView: React.FC<{ f: TreeFrame }> = ({ f }) => {
    const depth = Math.max(1, Math.floor(Math.log2(f.tree.length)) + 1);
    const W = 320, H = 30 + depth * 52;
    const pos = (i: number) => {
        const d = Math.floor(Math.log2(i + 1));
        const p = i - (2 ** d - 1);
        return { x: ((p + 0.5) * W) / 2 ** d, y: 22 + d * 52 };
    };
    const present = (i: number) => i < f.tree.length && f.tree[i] !== null;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-64 [.vis-expanded_&]:max-h-[55vh]" role="img" aria-label="Binary tree">
            {f.tree.map((_, i) => i > 0 && present(i) && present(Math.floor((i - 1) / 2)) ? (
                <line key={`e${i}`} x1={pos(Math.floor((i - 1) / 2)).x} y1={pos(Math.floor((i - 1) / 2)).y} x2={pos(i).x} y2={pos(i).y} stroke="#334155" strokeWidth={2} />
            ) : null)}
            {f.tree.map((v, i) => v === null ? null : (
                <g key={i}>
                    <circle cx={pos(i).x} cy={pos(i).y} r={15} fill={FILL[f.tones?.[i] ?? 'idle']} stroke={f.current === i ? '#e879f9' : '#475569'} strokeWidth={f.current === i ? 3.5 : 1.5} />
                    <text x={pos(i).x} y={pos(i).y + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={f.tones?.[i] === 'compare' ? '#0f172a' : '#f8fafc'} fontWeight={600}>{v}</text>
                </g>
            ))}
        </svg>
    );
};

const sameEdge = (e: [number, number] | undefined, a: number, b: number) => !!e && ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));

const GraphView: React.FC<{ f: GraphFrame }> = ({ f }) => (
    <svg viewBox="0 0 100 100" className="w-full h-56 [.vis-expanded_&]:h-[55vh]" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graph">
        {f.graph.edges.map(([a, b]) => {
            const A = f.graph.nodes[a], B = f.graph.nodes[b];
            const active = sameEdge(f.edge, a, b);
            const tree = f.treeEdges.some(([x, y]) => sameEdge([x, y], a, b));
            return <line key={`${a}-${b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={active ? '#fcd34d' : tree ? '#10b981' : '#334155'} strokeWidth={active ? 1.6 : tree ? 1.2 : 0.8} />;
        })}
        {f.graph.nodes.map((n, i) => (
            <g key={i}>
                <circle cx={n.x} cy={n.y} r={5.5} fill={FILL[f.tones?.[i] ?? 'idle']} stroke={f.current === i ? '#e879f9' : '#475569'} strokeWidth={f.current === i ? 1.4 : 0.6} />
                <text x={n.x} y={n.y + 1.6} textAnchor="middle" fontSize={4.4} fontFamily="monospace" fontWeight={700} fill={f.tones?.[i] === 'compare' ? '#0f172a' : '#f8fafc'}>{i}</text>
            </g>
        ))}
    </svg>
);

const TableView: React.FC<{ f: TableFrame }> = ({ f }) => {
    const isAt = (r: number, c: number, cells?: [number, number][]) => !!cells?.some(([x, y]) => x === r && y === c);
    const ref = useKeepInView(f);
    return (
        <div ref={ref} className="overflow-x-auto">
            <table className="mx-auto text-xs font-mono border-collapse">
                <thead>
                    <tr>
                        <th className="px-2 py-1" />
                        {f.colHeaders.map((h, i) => <th key={i} className="px-2 py-1 text-slate-400 font-normal">{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {f.rows.map((row, r) => (
                        <tr key={r}>
                            <th className="px-2 py-1 text-right text-slate-400 font-normal whitespace-nowrap">{row.label}</th>
                            {row.cells.map((v, c) => {
                                const current = f.current?.[0] === r && f.current?.[1] === c;
                                const dep = isAt(r, c, f.deps);
                                return (
                                    <td key={c} data-focus={current} className={`w-9 h-8 [.vis-expanded_&]:w-12 [.vis-expanded_&]:h-11 [.vis-expanded_&]:text-sm text-center border transition-colors ${
                                        current ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold' : dep ? 'bg-sky-500/80 text-white border-sky-300' : 'border-slate-700 text-slate-200 bg-slate-900'}`}>
                                        {v === null ? <span className="text-slate-700">·</span> : v}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const FrameView: React.FC<{ frame: Frame }> = ({ frame }) => {
    switch (frame.kind) {
        case 'array': return <ArrayView f={frame} />;
        case 'list': return <ListView f={frame} />;
        case 'tree': return <TreeView f={frame} />;
        case 'graph': return <GraphView f={frame} />;
        case 'table': return <TableView f={frame} />;
    }
};

/** Visualiser for any registered (type, algorithm) pair in structures.ts. */
export const StructureVisualizer: React.FC<{ type: string; algorithm: string; options?: string[] }> = ({ type, algorithm, options }) => {
    const [selected, setSelected] = useState(algorithm);
    const algo = VISUALS[type]?.[selected];
    const [input, setInput] = useState<unknown>(() => algo?.sample());
    const frames = useMemo(() => (algo ? algo.run(input) : []), [algo, input]);
    const stepper = useStepper(frames.length);
    const frame = frames[stepper.step];
    if (!algo || !frame) return null;

    const load = (value: unknown) => {
        setInput(value);
        stepper.reset();
    };
    // Variants that read the same kind of input (e.g. three traversals of one tree) keep it, so they're easy to compare.
    const switchTo = (next: string) => {
        const nextAlgo = VISUALS[type][next];
        setSelected(next);
        load(nextAlgo.parse === algo.parse ? input : nextAlgo.sample());
    };
    const choices = options && options.length > 1 ? options.filter((o) => VISUALS[type]?.[o]) : [];

    return (
        <VisualShell
            name={algo.name}
            stepper={stepper}
            note={frame.note}
            footer={
                <>
                    <ExampleBar
                        hint={algo.hint}
                        onRandom={() => load(algo.sample())}
                        onCustom={(text) => {
                            const parsed = algo.parse(text);
                            if (typeof parsed === 'string') return parsed; // a string is an error message
                            load(parsed);
                            return null;
                        }}
                    />
                    <Legend items={LEGENDS[frame.kind]} />
                </>
            }
        >
            {choices.length > 1 && (
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Variant">
                    {choices.map((o) => (
                        <button
                            key={o}
                            type="button"
                            role="tab"
                            aria-selected={o === selected}
                            onClick={() => o !== selected && switchTo(o)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${o === selected ? 'bg-indigo-500/25 text-indigo-100 border border-indigo-400/50' : 'bg-slate-800 text-slate-400 hover:text-white border border-transparent'}`}
                        >
                            {VISUALS[type][o].name}
                        </button>
                    ))}
                </div>
            )}
            <FrameView frame={frame} />
            <Aux aux={frame.aux} />
        </VisualShell>
    );
};
