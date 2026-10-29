import React, { useEffect, useState } from 'react';
import { FaBookOpen, FaBullseye, FaMapSigns } from 'react-icons/fa';
import { useLearning } from '../context/LearningContext';
import { api } from '../services/api';

export type View = 'roadmap' | 'topics' | 'playbook';

const TABS: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'roadmap', label: 'Roadmap', icon: <FaMapSigns size={17} /> },
    { id: 'topics', label: 'Lessons', icon: <FaBookOpen size={17} /> },
    { id: 'playbook', label: 'Playbook', icon: <FaBullseye size={17} /> },
];

/** Phone-only tab bar at the bottom of the screen, within thumb reach. Shows roadmap progress on its tab. */
export const BottomNav: React.FC<{ view: View; onChange: (view: View) => void }> = ({ view, onChange }) => {
    const { isDone } = useLearning();
    const [itemIds, setItemIds] = useState<string[]>([]);

    useEffect(() => {
        api.getRoadmap()
            .then((r) => setItemIds(r.blocks.flatMap((b) => b.items.map((i) => i.id))))
            .catch(() => setItemIds([]));
    }, []);

    const done = itemIds.filter(isDone).length;

    return (
        <nav
            aria-label="Main navigation"
            className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="grid grid-cols-3">
                {TABS.map((t) => {
                    const active = view === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
                            aria-current={active ? 'page' : undefined}
                            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                                active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {active && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-indigo-400" />}
                            <span className={active ? 'text-indigo-300' : ''}>{t.icon}</span>
                            <span>
                                {t.label}
                                {t.id === 'roadmap' && itemIds.length > 0 && (
                                    <span className="ml-1 text-[10px] text-slate-400">{done}/{itemIds.length}</span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
