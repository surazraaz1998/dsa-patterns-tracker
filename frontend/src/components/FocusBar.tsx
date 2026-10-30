import React from 'react';
import { FaCompress, FaSearch } from 'react-icons/fa';

/** The only chrome in focus mode: what you're reading, search, and the way out. */
export const FocusBar: React.FC<{ title: string; onExit: () => void; onOpenSearch: () => void }> = ({ title, onExit, onOpenSearch }) => (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider text-indigo-300 shrink-0">Focus</span>
            <p className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-200">{title}</p>
            <button
                type="button"
                onClick={onOpenSearch}
                aria-label="Search lessons"
                title="Search (⌘K)"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
                <FaSearch size={13} />
            </button>
            <button
                type="button"
                onClick={onExit}
                title="Exit focus (Esc)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
                <FaCompress size={11} /> Exit focus
            </button>
        </div>
    </header>
);
