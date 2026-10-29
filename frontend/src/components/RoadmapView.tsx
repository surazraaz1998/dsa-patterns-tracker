import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaRegCircle, FaExternalLinkAlt, FaFlagCheckered, FaHistory, FaArrowRight } from 'react-icons/fa';
import { useLearning } from '../context/LearningContext';
import { useTrack } from '../context/TrackContext';
import { api } from '../services/api';
import { Roadmap } from '../types';
import { getLastLesson } from '../services/recent';
import { RoadmapSkeleton } from './Skeleton';

export const TRACK_STYLE: Record<string, { label: string; chip: string }> = {
    dsa: { label: 'DSA', chip: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
    'system-design': { label: 'HLD', chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
    lld: { label: 'LLD', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    'agentic-ai': { label: 'AI', chip: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30' },
};

type RoadmapViewProps = {
    onOpenLesson: (slug: string, trackId: string, mode?: 'full' | 'revision') => void;
};

export const RoadmapView: React.FC<RoadmapViewProps> = ({ onOpenLesson }) => {
    const { isDone, toggleDone, isLessonDone, streak, weekDone, weeklyGoal, studiedToday, dueRevisions } = useLearning();
    const { tracks } = useTrack();
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lessonNames, setLessonNames] = useState<Record<string, string>>({});

    const load = () => {
        setError(null);
        api.getRoadmap().then(setRoadmap).catch((e) => setError(e.message));
    };
    useEffect(load, []);

    // Friendly names for lesson chips, from the topic lists of the roadmap tracks.
    useEffect(() => {
        if (!roadmap) return;
        const ids = Array.from(new Set(roadmap.blocks.flatMap((b) => b.items.map((i) => i.track))));
        Promise.all(ids.map((id) => api.getPatterns(id).catch(() => [])))
            .then((lists) => setLessonNames(Object.fromEntries(lists.flat().map((p) => [p.slug, p.name]))));
    }, [roadmap]);

    if (error) {
        return (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100 flex flex-wrap items-center justify-between gap-3">
                <span>Couldn't load the roadmap: {error}</span>
                <button type="button" onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold">Retry</button>
            </div>
        );
    }
    if (!roadmap) return <RoadmapSkeleton />;

    const allItems = roadmap.blocks.flatMap((b) => b.items);
    const doneCount = allItems.filter((i) => isDone(i.id)).length;
    const trackName = (id: string) => tracks.find((t) => t.id === id)?.name ?? id;

    // "Continue" card: the last lesson opened on this device, and the first roadmap item not ticked yet.
    const last = getLastLesson();
    const nextBlock = roadmap.blocks.find((b) => b.items.some((i) => !isDone(i.id)));
    const nextItem = nextBlock?.items.find((i) => !isDone(i.id));
    const nextSlug = nextItem && (nextItem.lessons.find((slug) => !isLessonDone(slug)) ?? nextItem.lessons[0]);

    return (
        <div className="space-y-6">
            <header className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-3">
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{roadmap.title}</h1>
                <p className="text-sm text-slate-300 leading-relaxed">{roadmap.subtitle}</p>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${(doneCount / allItems.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">{doneCount} / {allItems.length} done</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Study stats">
                    <span className="inline-flex items-center gap-1.5 text-slate-200" title="Days in a row with a quiz, lesson or roadmap item done">
                        <span className="keep-colors" aria-hidden>🔥</span>
                        {streak > 0 ? (
                            <span><strong className="text-white">{streak}</strong>-day streak</span>
                        ) : (
                            <span>Start a streak today</span>
                        )}
                        {!studiedToday && streak > 0 && <span className="text-xs text-amber-300">· study today to keep it</span>}
                    </span>
                    <span className="inline-flex items-center gap-2 text-slate-200">
                        This week: <strong className="text-white">{Math.min(weekDone, weeklyGoal)}/{weeklyGoal}</strong>
                        <span className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden>
                            <span className="block h-full bg-emerald-400" style={{ width: `${Math.min(100, (weekDone / weeklyGoal) * 100)}%` }} />
                        </span>
                        {weekDone >= weeklyGoal && <span className="text-xs text-emerald-300">goal met</span>}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                    {Object.entries(TRACK_STYLE).map(([id, s]) => (
                        <span key={id} className={`px-2 py-0.5 rounded-full border font-semibold ${s.chip}`}>{s.label} · {trackName(id)}</span>
                    ))}
                </div>
            </header>

            <section aria-label="Continue" className="grid sm:grid-cols-2 gap-3">
                {dueRevisions.length > 0 && (
                    <div className="sm:col-span-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Recap due · 3 quick questions each</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {dueRevisions.map((slug) => (
                                <button
                                    key={slug}
                                    type="button"
                                    onClick={() => onOpenLesson(slug, slugTrack(slug, 'dsa'), 'revision')}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-50 text-xs font-bold"
                                >
                                    ⚡ {lessonNames[slug] ?? slug} <FaArrowRight size={10} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {last && (
                    <button
                        type="button"
                        onClick={() => onOpenLesson(last.slug, last.trackId)}
                        className="text-left bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-4 transition group"
                    >
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5"><FaHistory size={10} /> Pick up where you left off</p>
                        <p className="mt-1.5 text-sm font-bold text-white flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate">{last.name}</span>
                            <FaArrowRight size={12} className="shrink-0 text-slate-400 group-hover:text-white transition" />
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{trackName(last.trackId)}{isLessonDone(last.slug) ? ' · completed' : ''}</p>
                    </button>
                )}
                {nextItem && nextBlock ? (
                    <div className={`bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 ${last ? '' : 'sm:col-span-2'}`}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">{doneCount === 0 ? 'Start here' : 'Next on your roadmap'} · Weeks {nextBlock.weeks}</p>
                        <p className="mt-1.5 text-sm font-bold text-white leading-snug">
                            <span className={`mr-1.5 px-1.5 py-0.5 rounded border text-[10px] font-bold align-middle ${(TRACK_STYLE[nextItem.track] ?? TRACK_STYLE.dsa).chip}`}>{(TRACK_STYLE[nextItem.track] ?? TRACK_STYLE.dsa).label}</span>
                            {nextItem.label}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {nextSlug && (
                                <button
                                    type="button"
                                    onClick={() => onOpenLesson(nextSlug, slugTrack(nextSlug, nextItem.track))}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                                >
                                    Open {lessonNames[nextSlug] ?? 'lesson'} <FaArrowRight size={10} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => toggleDone(nextItem.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/60 text-xs font-semibold"
                            >
                                <FaRegCircle size={10} /> Mark done
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-sm text-emerald-100 sm:col-span-2">
                        🎉 Every roadmap item is ticked. Time for mock interviews — the playbook has the checklist.
                    </div>
                )}
            </section>

            {roadmap.phases.map((phase) => {
                const blocks = roadmap.blocks.filter((b) => b.phase === phase.id);
                const items = blocks.flatMap((b) => b.items);
                const phaseDone = items.filter((i) => isDone(i.id)).length;
                return (
                    <section key={phase.id} className="space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Phase {phase.id} · Weeks {phase.weeks}</p>
                                <h2 className="text-lg font-extrabold text-white">{phase.name}</h2>
                                <p className="text-sm text-slate-400">{phase.goal}</p>
                            </div>
                            <span className="text-xs text-slate-400">{phaseDone} / {items.length}</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                            {blocks.map((block) => (
                                <div key={block.weeks} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                                    <h3 className="text-sm font-bold text-slate-200">Weeks {block.weeks}</h3>
                                    <ul className="space-y-3">
                                        {block.items.map((entry) => {
                                            const done = isDone(entry.id);
                                            const style = TRACK_STYLE[entry.track] ?? TRACK_STYLE.dsa;
                                            return (
                                                <li key={entry.id} className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDone(entry.id)}
                                                        aria-label={done ? `Mark "${entry.label}" not done` : `Mark "${entry.label}" done`}
                                                        className="-m-2 p-2 mt-[-6px] shrink-0 text-lg"
                                                    >
                                                        {done ? <FaCheckCircle className="text-emerald-400" /> : <FaRegCircle className="text-slate-400 hover:text-slate-300" />}
                                                    </button>
                                                    <div className="min-w-0 space-y-1.5">
                                                        <p className={`text-sm leading-snug ${done ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                                                            <span className={`mr-1.5 px-1.5 py-0.5 rounded border text-[10px] font-bold align-middle ${style.chip}`}>{style.label}</span>
                                                            {entry.label}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {entry.lessons.map((slug) => (
                                                                <button
                                                                    key={slug}
                                                                    type="button"
                                                                    onClick={() => onOpenLesson(slug, slugTrack(slug, entry.track))}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-xs text-slate-200 hover:text-white transition"
                                                                >
                                                                    {lessonNames[slug] ?? slug} →
                                                                </button>
                                                            ))}
                                                            {entry.resource && (entry.resource.url ? (
                                                                <a href={entry.resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-300">
                                                                    {entry.resource.label} <FaExternalLinkAlt size={8} />
                                                                </a>
                                                            ) : (
                                                                <span className="px-2 py-0.5 text-[11px] text-slate-400">{entry.resource.label}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 items-start rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
                            <FaFlagCheckered className="text-emerald-400 mt-0.5 shrink-0" />
                            <p><strong className="text-emerald-300">Checkpoint: </strong>{phase.checkpoint}</p>
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

// Lessons referenced from a combined mock (e.g. Ride Sharing = LLD + HLD) can live in another track.
function slugTrack(slug: string, fallback: string): string {
    if (slug.startsWith('hld-') || slug.startsWith('sd-')) return 'system-design';
    if (slug.startsWith('lld-')) return 'lld';
    if (slug.startsWith('ai-')) return 'agentic-ai';
    return fallback;
}
