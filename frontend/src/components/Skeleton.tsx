import React from 'react';

// Grey placeholder shapes shown while content loads, so the layout doesn't jump when it arrives.
const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`rounded-lg bg-slate-800/80 animate-pulse ${className}`} />
);

export const RoadmapSkeleton: React.FC = () => (
    <div className="space-y-6" role="status" aria-label="Loading roadmap">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-3">
            <Bar className="h-7 w-2/3" />
            <Bar className="h-4 w-full" />
            <Bar className="h-2 w-full" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
            <Bar className="h-24" />
            <Bar className="h-24" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <Bar className="h-4 w-24" />
                    <Bar className="h-4 w-full" />
                    <Bar className="h-4 w-5/6" />
                    <Bar className="h-4 w-4/6" />
                </div>
            ))}
        </div>
    </div>
);

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="space-y-2.5" role="status" aria-label="Loading">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-800/30 space-y-2">
                <Bar className="h-4 w-1/2" />
                <Bar className="h-3 w-full" />
                <Bar className="h-3 w-4/5" />
            </div>
        ))}
    </div>
);

export const LessonSkeleton: React.FC = () => (
    <section className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-5" role="status" aria-label="Loading lesson">
        <Bar className="h-7 w-1/2" />
        <Bar className="h-4 w-3/4" />
        <div className="flex gap-2"><Bar className="h-6 w-28" /><Bar className="h-6 w-20" /></div>
        <div className="rounded-2xl border border-slate-800 p-4 space-y-2.5">
            <Bar className="h-4 w-32" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-2/3" />
        </div>
        <Bar className="h-40 w-full" />
    </section>
);
