import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Roadmap } from '../types';

const ROUNDS: { key: 'dsa' | 'hld' | 'lld'; title: string; tone: string }[] = [
    { key: 'dsa', title: 'DSA rounds', tone: 'border-blue-500/30 text-blue-300' },
    { key: 'hld', title: 'High-level design rounds', tone: 'border-amber-500/30 text-amber-300' },
    { key: 'lld', title: 'Low-level design rounds', tone: 'border-emerald-500/30 text-emerald-300' },
];

export const PlaybookView: React.FC = () => {
    const [playbook, setPlaybook] = useState<Roadmap['playbook'] | null>(null);

    useEffect(() => {
        api.getRoadmap().then((r) => setPlaybook(r.playbook)).catch(() => setPlaybook(null));
    }, []);

    if (!playbook) return <p className="text-sm text-slate-400 p-6 animate-pulse">Loading playbook…</p>;

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
                                    <span className="text-slate-500 font-mono shrink-0">{i + 1}.</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                ))}
            </div>
        </div>
    );
};
