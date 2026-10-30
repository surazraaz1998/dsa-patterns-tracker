import React, { useId } from 'react';
import { DEdge, DIAGRAMS, DNode, edgeKey, NodeKind } from './diagrams';
import { Legend, useStepper, VisualShell } from './player';

const W = 680;
const H = 360;

const KIND_STYLE: Record<NodeKind, string> = {
    client: 'fill-sky-500/15 stroke-sky-400',
    service: 'fill-indigo-500/15 stroke-indigo-400',
    store: 'fill-emerald-500/15 stroke-emerald-400',
    cache: 'fill-amber-500/15 stroke-amber-400',
    queue: 'fill-fuchsia-500/15 stroke-fuchsia-400',
    external: 'fill-slate-500/10 stroke-slate-400',
    class: 'fill-slate-900 stroke-violet-400',
    state: 'fill-teal-500/15 stroke-teal-400',
    cell: 'fill-slate-800/30 stroke-slate-600',
    pin: 'fill-rose-500/30 stroke-rose-400',
};
const KIND_LEGEND: { kind: NodeKind; label: string; className: string }[] = [
    { kind: 'client', label: 'client', className: 'bg-sky-400' },
    { kind: 'service', label: 'service', className: 'bg-indigo-400' },
    { kind: 'store', label: 'database / storage', className: 'bg-emerald-400' },
    { kind: 'cache', label: 'cache / in-memory', className: 'bg-amber-400' },
    { kind: 'queue', label: 'queue / stream', className: 'bg-fuchsia-400' },
    { kind: 'external', label: 'third party', className: 'bg-slate-400' },
];

const DIM = '#64748b';
const ON = '#a5b4fc';

function size(node: DNode) {
    if (node.kind === 'class') {
        const f = node.fields?.length ?? 0;
        return { w: node.w ?? 140, h: node.h ?? 26 + (node.stereo ? 12 : 0) + (f ? f * 15 + 8 : 0) };
    }
    return { w: node.w ?? 120, h: node.h ?? (node.sub ? 44 : 32) };
}

// Where a line from the box centre in direction (dx, dy) leaves the box (plus a small gap).
function clip(node: DNode, dx: number, dy: number) {
    const { w, h } = size(node);
    const t = Math.min((w / 2 + 3) / Math.abs(dx || 1e-9), (h / 2 + 3) / Math.abs(dy || 1e-9));
    return { x: node.x + dx * t, y: node.y + dy * t };
}

function edgePath(a: DNode, b: DNode, curve = 0) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const c = { x: mx - ((b.y - a.y) / len) * curve, y: my + ((b.x - a.x) / len) * curve };
    const s = clip(a, c.x - a.x, c.y - a.y);
    const t = clip(b, c.x - b.x, c.y - b.y);
    const d = curve ? `M${s.x},${s.y} Q${c.x},${c.y} ${t.x},${t.y}` : `M${s.x},${s.y} L${t.x},${t.y}`;
    const label = curve ? { x: 0.25 * s.x + 0.5 * c.x + 0.25 * t.x, y: 0.25 * s.y + 0.5 * c.y + 0.25 * t.y } : { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
    return { d, label };
}

const Markers: React.FC<{ id: string }> = ({ id }) => (
    <defs>
        {([['d', DIM], ['o', ON]] as const).map(([tone, color]) => (
            <React.Fragment key={tone}>
                <marker id={`${id}-arrow-${tone}`} viewBox="0 0 10 8" refX="10" refY="4" markerWidth="10" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
                    <path d="M0,0 L10,4 L0,8 z" fill={color} />
                </marker>
                <marker id={`${id}-open-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
                    <path d="M1,1 L9,5 L1,9" fill="none" stroke={color} strokeWidth="1.5" />
                </marker>
                <marker id={`${id}-tri-${tone}`} viewBox="0 0 14 14" refX="13" refY="7" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto">
                    <path d="M1,1 L13,7 L1,13 z" fill="#0b1120" stroke={color} strokeWidth="1.5" />
                </marker>
                <marker id={`${id}-dia-${tone}`} viewBox="0 0 16 10" refX="1" refY="5" markerWidth="16" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
                    <path d="M1,5 L8,1 L15,5 L8,9 z" fill={color} stroke={color} strokeWidth="1" />
                </marker>
                <marker id={`${id}-odia-${tone}`} viewBox="0 0 16 10" refX="1" refY="5" markerWidth="16" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
                    <path d="M1,5 L8,1 L15,5 L8,9 z" fill="#0b1120" stroke={color} strokeWidth="1.2" />
                </marker>
            </React.Fragment>
        ))}
    </defs>
);

function markersFor(edge: DEdge, id: string, tone: 'd' | 'o') {
    const m = (name: string) => `url(#${id}-${name}-${tone})`;
    switch (edge.kind) {
        case 'inherit':
        case 'realize':
            return { markerEnd: m('tri') };
        case 'compose':
            return { markerStart: m('dia') };
        case 'aggregate':
            return { markerStart: m('odia') };
        case 'uses':
        case 'dep':
            return { markerEnd: m('open') };
        default:
            return { markerEnd: m('arrow') };
    }
}

const NodeBox: React.FC<{ node: DNode; opacity: number; active: boolean }> = ({ node, opacity, active }) => {
    const { w, h } = size(node);
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const rx = node.kind === 'state' || node.kind === 'pin' ? Math.min(h / 2, 18) : node.kind === 'store' ? 12 : 8;
    const stroke = { strokeWidth: active ? 2 : 1.25, strokeDasharray: node.kind === 'external' ? '5 4' : undefined };
    let body: React.ReactNode;
    if (node.kind === 'cell') {
        body = <text x={x + 8} y={y + 16} className="fill-slate-400 font-mono" fontSize="11">{node.label}</text>;
    } else if (node.kind === 'class') {
        const top = y + (node.stereo ? 13 : 0);
        body = (
            <>
                {node.stereo && <text x={node.x} y={y + 12} textAnchor="middle" className="fill-slate-400" fontSize="9.5" fontStyle="italic">{node.stereo}</text>}
                <text x={node.x} y={top + 17} textAnchor="middle" className="fill-slate-50" fontSize="12.5" fontWeight="700">{node.label}</text>
                {node.fields && node.fields.length > 0 && (
                    <>
                        <line x1={x} x2={x + w} y1={top + 25} y2={top + 25} className="stroke-violet-400/50" />
                        {node.fields.map((f, i) => (
                            <text key={f} x={x + 8} y={top + 39 + i * 15} className="fill-slate-300 font-mono" fontSize="10">{f}</text>
                        ))}
                    </>
                )}
            </>
        );
    } else {
        body = (
            <>
                <text x={node.x} y={node.y + (node.sub ? -3 : 4)} textAnchor="middle" className="fill-slate-50" fontSize="12" fontWeight="700">{node.label}</text>
                {node.sub && <text x={node.x} y={node.y + 13} textAnchor="middle" className="fill-slate-400" fontSize="10">{node.sub}</text>}
            </>
        );
    }
    return (
        <g style={{ opacity, transition: 'opacity 400ms' }}>
            <rect x={x} y={y} width={w} height={h} rx={rx} className={KIND_STYLE[node.kind]} style={stroke} />
            {body}
        </g>
    );
};

/** A step-through architecture / class / state diagram from `DIAGRAMS`. */
export const DiagramVisualizer: React.FC<{ id: string }> = ({ id }) => {
    const diagram = DIAGRAMS[id];
    const stepper = useStepper(diagram?.steps.length ?? 1);
    const uid = useId().replace(/:/g, '');
    if (!diagram) return null;

    const upTo = diagram.steps.slice(0, stepper.step + 1);
    const step = upTo[upTo.length - 1];
    const everything = upTo.some((s) => s.all);
    const shown = new Set(upTo.flatMap((s) => s.on ?? []));
    const active = new Set(step.all ? [...diagram.nodes.map((nd) => nd.id), ...diagram.edges.map(edgeKey)] : step.on ?? []);
    const opacityOf = (key: string) => (active.has(key) ? 1 : everything || shown.has(key) ? 0.4 : 0);
    const byId = Object.fromEntries(diagram.nodes.map((nd) => [nd.id, nd]));
    const isUml = diagram.nodes.some((nd) => nd.kind === 'class');
    const kinds = new Set(diagram.nodes.map((nd) => nd.kind));
    const legend = KIND_LEGEND.filter((l) => kinds.has(l.kind));

    return (
        <VisualShell
            name={diagram.title}
            stepper={stepper}
            note={step.note}
            footer={isUml ? (
                <p className="text-[11px] text-slate-300">
                    <span className="mr-3">▷ solid: is-a (inherits)</span>
                    <span className="mr-3">▷ dashed: implements</span>
                    <span className="mr-3">◆ owns (same lifetime)</span>
                    <span className="mr-3">◇ has (lives apart)</span>
                    <span>→ uses</span>
                </p>
            ) : legend.length > 0 ? <Legend items={legend} /> : null}
        >
            <p className="md:hidden [.vis-expanded_&]:hidden text-[11px] text-slate-400">Swipe sideways to see the whole diagram, or tap ⛶ for full screen.</p>
            <div className="overflow-x-auto -mx-1 px-1">
                <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${diagram.title}: ${step.note}`} className="w-full h-auto min-w-[560px] md:min-w-0 [.vis-expanded_&]:max-h-[62vh]">
                    <Markers id={uid} />
                    {/* cells under everything else */}
                    {diagram.nodes.filter((nd) => nd.kind === 'cell').map((nd) => (
                        <NodeBox key={nd.id} node={nd} opacity={opacityOf(nd.id) || 0.12} active={active.has(nd.id)} />
                    ))}
                    {diagram.edges.map((edge) => {
                        const key = edgeKey(edge);
                        const a = byId[edge.from];
                        const b = byId[edge.to];
                        if (!a || !b) return null;
                        const on = active.has(key);
                        const { d, label } = edgePath(a, b, edge.curve);
                        const color = on ? ON : DIM;
                        return (
                            <g key={key} style={{ opacity: opacityOf(key), transition: 'opacity 400ms' }}>
                                <path
                                    d={d}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={on ? 2 : 1.4}
                                    strokeDasharray={edge.kind === 'realize' || edge.kind === 'dep' ? '6 4' : undefined}
                                    className={on && (edge.kind ?? 'flow') === 'flow' ? 'dia-flow' : undefined}
                                    {...markersFor(edge, uid, on ? 'o' : 'd')}
                                />
                                {edge.label && (
                                    <text x={label.x} y={label.y - 4} textAnchor="middle" fontSize="10.5" className={on ? 'fill-indigo-100' : 'fill-slate-400'} style={{ paintOrder: 'stroke', stroke: '#020617', strokeWidth: 4 }}>
                                        {edge.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {diagram.nodes.filter((nd) => nd.kind !== 'cell').map((nd) => (
                        <NodeBox key={nd.id} node={nd} opacity={opacityOf(nd.id)} active={active.has(nd.id)} />
                    ))}
                </svg>
            </div>
        </VisualShell>
    );
};
