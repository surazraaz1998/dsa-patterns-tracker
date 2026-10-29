import React, { useEffect, useState } from 'react';
import { FaBolt } from 'react-icons/fa';
import { useLearning } from '../context/LearningContext';
import { useTrack } from '../context/TrackContext';
import { api } from '../services/api';
import { PatternSummary, Roadmap } from '../types';
import { ListSkeleton } from './Skeleton';

const ROUNDS: { key: 'dsa' | 'hld' | 'lld'; title: string; tone: string }[] = [
    { key: 'dsa', title: 'DSA rounds', tone: 'border-blue-500/30 text-blue-300' },
    { key: 'hld', title: 'High-level design rounds', tone: 'border-amber-500/30 text-amber-300' },
    { key: 'lld', title: 'Low-level design rounds', tone: 'border-emerald-500/30 text-emerald-300' },
];

// Tracks that have full lessons on the roadmap, in roadmap order.
const REVISION_TRACKS = ['dsa', 'system-design', 'lld', 'agentic-ai'];

export const PlaybookView: React.FC<{ onOpenRevision: (slug: string, trackId: string) => void }> = ({ onOpenRevision }) => {
    const [playbook, setPlaybook] = useState<Roadmap['playbook'] | null>(null);
    const [lessons, setLessons] = useState<Record<string, PatternSummary[]>>({});
    const { tracks } = useTrack();
    const { isLessonDone, dueRevisions } = useLearning();

    useEffect(() => {
        api.getRoadmap().then((r) => setPlaybook(r.playbook)).catch(() => setPlaybook(null));
        Promise.all(REVISION_TRACKS.map((t) => api.getPatterns(t).catch(() => [] as PatternSummary[])))
            .then((lists) => setLessons(Object.fromEntries(REVISION_TRACKS.map((t, i) => [t, lists[i].filter((p) => p.lesson_status === 'full')]))));
    }, []);

    if (!playbook) return <div className="grid md:grid-cols-3 gap-4"><ListSkeleton rows={2} /><ListSkeleton rows={2} /><ListSkeleton rows={2} /></div>;

    return (
        <div className="space-y-4">
            <header className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6">
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Interview-day playbook</h1>
                <p className="text-sm text-slate-300 mt-1">What to do, in order, in each type of round. Read it the night before.</p>
            </header>
            <div className="grid md:grid-cols-3 gap-4">
                {ROUNDS.map((round) => (
                    <section key={round.key} className={`bg-slate-900/80 border rounded-2xl p-4 space-y-3 ${round.tone.split(' ')[0]}`}>
                        <h2 className={`text-sm font-bold ${round.tone.split(' ')[1]}`}>{round.title}</h2>
                        <ol className="space-y-2 text-sm text-slate-200">
                            {playbook[round.key].map((tip, i) => (
                                <li key={i} className="flex gap-2 leading-relaxed">
                                    <span className="text-slate-400 font-mono shrink-0">{i + 1}.</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                ))}
            </div>

            <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4" aria-labelledby="revision-pages">
                <div>
                    <h2 id="revision-pages" className="text-lg font-extrabold text-white flex items-center gap-2"><FaBolt className="text-amber-400" /> Night-before revision</h2>
                    <p className="text-sm text-slate-300 mt-1">Each lesson on one page: the idea, how to spot it, the template, mistakes to avoid and a 3-question recap.</p>
                </div>
                {Object.keys(lessons).length === 0 ? (
                    <ListSkeleton rows={2} />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {REVISION_TRACKS.filter((t) => lessons[t]?.length).map((t) => (
                            <div key={t} className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{tracks.find((x) => x.id === t)?.name ?? t}</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {lessons[t].map((p) => {
                                        const done = isLessonDone(p.slug);
                                        const due = dueRevisions.includes(p.slug);
                                        return (
                                            <button
                                                key={p.slug}
                                                type="button"
                                                onClick={() => onOpenRevision(p.slug, t)}
                                                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                                                    due ? 'border-amber-500/50 bg-amber-500/10 text-amber-100' : done ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-indigo-500/60'
                                                }`}
                                            >
                                                {done && '✓ '}{p.name}{due && ' · recap due'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};
