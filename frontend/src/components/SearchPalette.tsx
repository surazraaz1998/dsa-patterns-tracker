import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaBookOpen, FaCode, FaListUl, FaSearch } from 'react-icons/fa';
import { api, SearchItem } from '../services/api';
import { search, SearchResult } from '../services/search';
import { useTrack } from '../context/TrackContext';

const KIND = {
    lesson: { label: 'Lesson', icon: <FaBookOpen size={12} />, tone: 'text-indigo-300' },
    section: { label: 'Section', icon: <FaListUl size={12} />, tone: 'text-amber-300' },
    problem: { label: 'Problem', icon: <FaCode size={12} />, tone: 'text-emerald-300' },
} as const;

/** Search lessons, deep-dive sections and practice problems across every track. */
export const SearchPalette: React.FC<{ open: boolean; onClose: () => void; onPick: (result: SearchResult) => void }> = ({ open, onClose, onPick }) => {
    const [index, setIndex] = useState<SearchItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const { tracks } = useTrack();

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setActive(0);
        api.getSearchIndex().then(setIndex).catch((e) => setError(e.message));
        requestAnimationFrame(() => inputRef.current?.focus());
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const results = useMemo(() => (index ? search(index, query) : []), [index, query]);
    useEffect(() => setActive(0), [query]);
    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    if (!open) return null;

    const pick = (r: SearchResult) => {
        onClose();
        onPick(r);
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
        else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
    };
    const trackName = (id: string) => tracks.find((t) => t.id === id)?.name ?? id;

    return (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Search">
            <button type="button" aria-label="Close search" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 md:inset-auto md:left-1/2 md:top-[12vh] md:-translate-x-1/2 md:w-[640px] md:max-h-[70vh] flex flex-col bg-slate-900 md:rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 border-b border-slate-800">
                    <FaSearch className="text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search lessons, sections and problems…"
                        aria-label="Search"
                        aria-controls="search-results"
                        aria-activedescendant={results[active] ? `search-result-${active}` : undefined}
                        className="flex-1 bg-transparent py-4 text-base text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md border border-slate-700">
                        Esc
                    </button>
                </div>
                <ul id="search-results" ref={listRef} role="listbox" className="flex-1 overflow-y-auto p-2">
                    {error && <li className="p-4 text-sm text-rose-300">{error}</li>}
                    {!index && !error && <li className="p-4 text-sm text-slate-400 animate-pulse">Loading…</li>}
                    {index && !query && (
                        <li className="p-4 text-sm text-slate-400">
                            Try <em>binary search</em>, <em>heap sort</em>, <em>rate limiter</em>, <em>LangGraph</em> or a LeetCode problem name.
                        </li>
                    )}
                    {index && query && results.length === 0 && <li className="p-4 text-sm text-slate-400">No matches for “{query}”.</li>}
                    {results.map((r, i) => (
                        <li
                            key={`${r.kind}-${r.slug}-${r.title}`}
                            id={`search-result-${i}`}
                            data-index={i}
                            role="option"
                            aria-selected={i === active}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => pick(r)}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${i === active ? 'bg-indigo-500/20' : ''}`}
                        >
                            <span className={`mt-0.5 shrink-0 ${KIND[r.kind].tone}`}>{KIND[r.kind].icon}</span>
                            <span className="min-w-0">
                                <span className="block text-sm text-white truncate">{r.title}</span>
                                <span className="block text-xs text-slate-400 truncate">
                                    {KIND[r.kind].label}{r.kind !== 'lesson' && ` · ${r.lessonName}`} · {trackName(r.track)}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="hidden md:block px-4 py-2 border-t border-slate-800 text-[11px] text-slate-400">↑ ↓ to move · Enter to open · Esc to close</p>
            </div>
        </div>
    );
};
