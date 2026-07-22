import React from 'react';
import { PatternDetail, PatternSummary } from '../types';
import { useTrack } from '../context/TrackContext';

type SidebarProps = {
    patterns: PatternSummary[];
    selectedPattern: PatternDetail | null;
    loading: boolean;
    error: string | null;
    onSelectPattern: (slug: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({
    patterns,
    selectedPattern,
    loading,
    error,
    onSelectPattern,
}) => {
    const { activeTrack } = useTrack();

    return (
        <aside className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-4 mb-3 border-b border-slate-800">
                <div>
                    <h2 className="text-base font-extrabold text-white tracking-tight">{activeTrack.name}</h2>
                    <span className="text-xs text-slate-400 font-medium">Pick a topic to practice</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {patterns.length} Topics
                </span>
            </div>

            {loading && (
                <div className="py-8 text-center text-xs text-slate-400">
                    <p className="animate-pulse">Loading topics list…</p>
                </div>
            )}

            {error && (
                <div className="py-4 text-center text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && patterns.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400">No topics found for this track.</p>
            )}

            {!loading && !error && patterns.length > 0 && (
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 space-y-2.5">
                    {patterns.map((pattern) => {
                        const isActive = selectedPattern?.slug === pattern.slug;
                        return (
                            <button
                                key={pattern.slug}
                                type="button"
                                onClick={() => onSelectPattern(pattern.slug)}
                                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-1.5 ${
                                    isActive
                                        ? 'bg-gradient-to-br from-slate-800 to-blue-950/50 border-blue-500 shadow-md shadow-blue-500/10'
                                        : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <strong className="text-sm font-bold text-white tracking-tight">{pattern.name}</strong>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {pattern.problem_count} {pattern.problem_count === 1 ? 'prob' : 'probs'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{pattern.description}</p>
                            </button>
                        );
                    })}
                </div>
            )}
        </aside>
    );
};
