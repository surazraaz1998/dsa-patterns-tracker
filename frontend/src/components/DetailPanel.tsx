import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PatternDetail, ProblemGuide } from '../types';
import { useAuth } from '../context/AuthContext';
import { LessonView } from './LessonView';
import { LessonSkeleton } from './Skeleton';
import { RevisionView } from './RevisionView';
import { useTrack } from '../context/TrackContext';
import { getSpot, saveSpot, setLastLesson, SavedSpot } from '../services/recent';
import { smooth } from '../services/prefs';
import {
    FaCheckCircle,
    FaRegCircle,
    FaExternalLinkAlt,
    FaLightbulb,
    FaCode,
    FaBrain,
    FaBolt,
    FaLaptopCode,
    FaCopy,
    FaCheck,
    FaSave,
    FaHistory,
    FaMicrophone,
    FaArrowUp,
    FaListUl,
    FaTimes
} from 'react-icons/fa';

export type LessonMode = 'full' | 'revision';

type DetailPanelProps = {
    selectedPattern: PatternDetail | null;
    loading?: boolean;
    mode?: LessonMode;
    onModeChange?: (mode: LessonMode) => void;
    focus?: { slug: string; section: string } | null; // scroll here once the lesson is on screen
    onFocused?: () => void;
    onOpenEdith?: () => void;
};

export const DetailPanel: React.FC<DetailPanelProps> = ({ selectedPattern, loading, mode = 'full', onModeChange, focus, onFocused, onOpenEdith }) => {
    const { getProblemStatus, getProblemProgress, toggleProblemSolved, saveSubmittedCode } = useAuth();
    const [expandedPanels, setExpandedPanels] = useState<Record<string, 'hints' | 'answer' | 'submission' | null>>({});
    const [activeLangTab, setActiveLangTab] = useState<Record<string, 'python' | 'javascript'>>({});
    const [userCodeInput, setUserCodeInput] = useState<Record<string, string>>({});
    const [userLangInput, setUserLangInput] = useState<Record<string, string>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [saveSuccessKey, setSaveSuccessKey] = useState<string | null>(null);
    // On md+ the lesson scrolls inside this box; on phones the page scrolls. Track both for "back to top".
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showTop, setShowTop] = useState(false);
    const { activeTrackId } = useTrack();
    const slug = selectedPattern?.slug;
    // Lesson navigation: section list, the section on screen, the phone "Sections" sheet, and "resume".
    const [sections, setSections] = useState<{ title: string; level: number }[]>([]);
    const [sectionsFor, setSectionsFor] = useState<string | undefined>(); // which lesson + mode `sections` describes
    const [current, setCurrent] = useState('');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [resume, setResume] = useState<SavedSpot | null>(null);
    const [headerH, setHeaderH] = useState(64);

    useEffect(() => {
        if (!slug || !selectedPattern) return;
        setLastLesson({ slug, trackId: selectedPattern.track_category ?? activeTrackId, name: selectedPattern.name });
        const spot = getSpot(slug);
        setResume(spot && spot.y > 600 ? spot : null);
        setHeaderH(document.querySelector('header')?.getBoundingClientRect().height ?? 64);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
        const box = scrollRef.current;
        if (!box) return;
        const els = () => [...box.querySelectorAll<HTMLElement>('[data-section]')];
        setSections(els().map((el) => ({ title: el.dataset.section!, level: el.dataset.sectionLevel ? Number(el.dataset.sectionLevel) : 1 })));
        setSectionsFor(`${slug}:${mode}`);
        let saveTimer = 0;
        const update = () => {
            const boxMode = box.scrollHeight > box.clientHeight + 1; // md+: the box scrolls; phones: the page does
            const offset = boxMode ? box.scrollTop : Math.max(0, window.scrollY - (box.getBoundingClientRect().top + window.scrollY));
            setShowTop(offset > 900);
            const line = boxMode ? box.getBoundingClientRect().top + 24 : 150;
            const here = els().filter((el) => el.getBoundingClientRect().top <= line).pop()?.dataset.section ?? '';
            setCurrent(here);
            if (offset > 300) setResume(null);
            window.clearTimeout(saveTimer);
            saveTimer = window.setTimeout(() => {
                if (slug) saveSpot(slug, offset > 300 ? { y: Math.round(offset), section: here } : null);
            }, 400);
        };
        window.addEventListener('scroll', update, { passive: true });
        box.addEventListener('scroll', update, { passive: true });
        return () => {
            window.clearTimeout(saveTimer);
            window.removeEventListener('scroll', update);
            box.removeEventListener('scroll', update);
        };
    }, [slug, mode]);

    useEffect(() => {
        if (!sheetOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [sheetOpen]);

    useEffect(() => {
        if (!focus || focus.slug !== slug || sectionsFor !== `${slug}:${mode}`) return;
        // concept sections are shown numbered ("3. Merge sort"); search gives the bare title
        const target = sections.find((sec) => sec.title === focus.section || sec.title.endsWith(`. ${focus.section}`));
        if (target) jumpTo(target.title);
        onFocused?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focus, slug, mode, sectionsFor]);

    const jumpTo = (title: string) => {
        setSheetOpen(false);
        const el = [...(scrollRef.current?.querySelectorAll<HTMLElement>('[data-section]') ?? [])].find((e) => e.dataset.section === title);
        // after the sheet closes and the page unlocks scrolling
        requestAnimationFrame(() => el?.scrollIntoView({ behavior: smooth(), block: 'start' }));
    };

    const backToTop = () => {
        scrollRef.current?.scrollTo({ top: 0, behavior: smooth() });
        const top = (scrollRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 140;
        if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: smooth() });
    };

    if (!selectedPattern && loading) {
        return (
            <LessonSkeleton />
        );
    }

    if (!selectedPattern) {
        return (
            <section className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-xl backdrop-blur-xl text-center text-slate-400">
                <h3 className="text-lg font-bold text-white mb-2">Select a Topic to Begin</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Choose any pattern from the topics list to review revision notes, practice tiered problems, and track your progress.
                </p>
            </section>
        );
    }

    const togglePanel = (problemKey: string, panel: 'hints' | 'answer' | 'submission') => {
        setExpandedPanels((current) => ({
            ...current,
            [problemKey]: current[problemKey] === panel ? null : panel,
        }));
    };

    const setLang = (problemKey: string, lang: 'python' | 'javascript') => {
        setActiveLangTab((prev) => ({ ...prev, [problemKey]: lang }));
    };

    const handleSaveCode = async (problemKey: string, problemTitle: string, problemId?: number) => {
        const code = userCodeInput[problemKey] ?? '';
        const lang = userLangInput[problemKey] || 'python';
        if (!code.trim()) return;

        await saveSubmittedCode(problemTitle, code, lang, problemId);
        setSaveSuccessKey(problemKey);
        setTimeout(() => setSaveSuccessKey(null), 2500);
    };

    const handleCopyCode = (key: string, code: string) => {
        void navigator.clipboard.writeText(code);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <>
        <section className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
            {/* Phones: a sticky bar with the section on screen and a button for the section list */}
            {sections.length > 2 && (
                <div
                    className="md:hidden sticky z-20 -mx-5 -mt-5 mb-4 px-4 py-2 rounded-t-3xl bg-slate-950/95 backdrop-blur border-b border-slate-800 flex items-center gap-2"
                    style={{ top: headerH }}
                >
                    <p className="flex-1 min-w-0 text-[11px] text-slate-400 truncate">
                        <span className="font-bold text-slate-200">{selectedPattern.name}</span>
                        {current && <> · {current}</>}
                    </p>
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100"
                        aria-haspopup="dialog"
                    >
                        <FaListUl size={11} /> Sections
                    </button>
                </div>
            )}
            <div ref={scrollRef} className="md:max-h-[calc(100vh-200px)] md:overflow-y-auto md:pr-1 xl:flex xl:gap-6 xl:items-start">
                <div className="min-w-0 flex-1 space-y-6 xl:max-w-3xl">
                    {/* Topic Title Header */}
                    <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-1">{selectedPattern.name}</h2>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{selectedPattern.description}</p>
                        </div>
                        {onOpenEdith && (
                            <button
                                type="button"
                                onClick={onOpenEdith}
                                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition"
                            >
                                <FaMicrophone size={12} /> Learn & test with EDITH
                            </button>
                        )}
                    </div>

                    {selectedPattern.lesson?.status === 'full' && onModeChange && (
                        <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800" role="tablist" aria-label="Lesson view">
                            {(['full', 'revision'] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === m}
                                    onClick={() => onModeChange(m)}
                                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${mode === m ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {m === 'full' ? 'Full lesson' : '⚡ Quick revision'}
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'full' && resume?.section && (
                        <button
                            type="button"
                            onClick={() => { jumpTo(resume.section!); setResume(null); }}
                            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-left text-sm text-indigo-100 hover:bg-indigo-500/20"
                        >
                            <span className="min-w-0 truncate"><FaHistory className="inline mr-2 text-indigo-300" size={12} />Resume at <strong>{resume.section}</strong></span>
                            <span className="shrink-0 text-xs text-indigo-300">Jump ↓</span>
                        </button>
                    )}

                    {selectedPattern.lesson && (mode === 'revision' && selectedPattern.lesson.status === 'full'
                        ? <RevisionView slug={selectedPattern.slug} lesson={selectedPattern.lesson} />
                        : <LessonView slug={selectedPattern.slug} lesson={selectedPattern.lesson} />)}

                    {/* Illustrative Pattern Overview & Solving Strategy (topics without a structured lesson) */}
                    {!selectedPattern.lesson && selectedPattern.revision_note_md && (
                        <div className="bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 border border-blue-500/20 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4">
                            {/* Header Badge & Title */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                                        <FaBrain className="text-base" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm md:text-base font-bold text-white tracking-wide">
                                            Concept Blueprint & Solving Strategy
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            Master the intuition and decision triggers before attempting the questions.
                                        </p>
                                    </div>
                                </div>
                                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                                    <FaBolt className="text-amber-400 text-[10px]" /> Intuition First
                                </span>
                            </div>

                            {/* Illustrative Markdown Container */}
                            <div className="markdown-body prose prose-invert max-w-none text-xs md:text-sm text-slate-300 leading-relaxed space-y-3">
                                <ReactMarkdown>{selectedPattern.revision_note_md}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Problem Tiers */}
                    {selectedPattern.lesson && mode === 'full' && (
                        <h3 data-section="Practice — easy to hard" className="text-base font-extrabold text-white pt-2 scroll-mt-32 md:scroll-mt-4">Practice — easy to hard</h3>
                    )}
                    <div className={`space-y-6 ${mode === 'revision' ? 'hidden' : ''}`}>
                        {Object.entries(selectedPattern.problems_by_tier || {}).map(([tier, problems = []]) => {
                            const tierMeta: Record<string, { label: string; badge: string; dot: string }> = {
                                '1': { label: 'Foundation', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
                                '2': { label: 'Core Fluency', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
                                '3': { label: 'Deep Dive', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
                                '4': { label: 'Interview Expert', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-400' },
                            };
                            const meta = tierMeta[tier] || { label: 'Problems', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' };

                            return (
                            <div key={tier} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 md:p-5">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2.5">
                                    <h3 className="text-sm md:text-base font-bold text-slate-200 flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                                        <span>Tier {tier} — {meta.label}</span>
                                    </h3>
                                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                                        {(problems || []).length} {(problems || []).length === 1 ? 'Problem' : 'Problems'}
                                    </span>
                                </div>

                                <ul className="space-y-3">
                                    {(problems || []).map((problem) => {
                                        const problemKey = problem.id != null ? String(problem.id) : `${problem.title}-${problem.leetcode_number ?? 'na'}`;
                                        const guide: ProblemGuide = problem.guide ?? {
                                            hints: ['Read the problem statement carefully and identify the core pattern.'],
                                            explanation: '',
                                            answer_md: '',
                                            python: '',
                                            javascript: '',
                                        };
                                        const hasCode = Boolean(guide.python || guide.javascript);
                                        const hasLink = Boolean(problem.leetcode_url && problem.leetcode_url !== '#');

                                        const pStatus = getProblemStatus(problem.title);
                                        const pProgress = getProblemProgress(problem.title);
                                        const isSolved = pStatus === 'solved';
                                        const isHintsOpen = expandedPanels[problemKey] === 'hints';
                                        const isAnswerOpen = expandedPanels[problemKey] === 'answer';
                                        const isSubmissionOpen = expandedPanels[problemKey] === 'submission';
                                        const currentLang = activeLangTab[problemKey] || (guide.javascript ? 'javascript' : 'python');
                                        const savedCode = pProgress?.submitted_code;
                                        const savedLang = pProgress?.submitted_language || 'python';
                                        const savedAt = pProgress?.last_submitted_at;

                                        return (
                                            <li
                                                key={problemKey}
                                                className={`p-3.5 md:p-4 rounded-2xl border transition-all ${
                                                    isSolved
                                                        ? 'bg-emerald-500/5 border-emerald-500/40'
                                                        : 'bg-slate-900/90 border-slate-800'
                                                }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    {/* Problem Title & Checkbox */}
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => void toggleProblemSolved(problem.title, problem.id)}
                                                            className="text-lg transition transform hover:scale-110 shrink-0"
                                                            title={isSolved ? 'Mark as unsolved' : 'Mark as solved'}
                                                        >
                                                            {isSolved ? (
                                                                <FaCheckCircle className="text-emerald-400" />
                                                            ) : (
                                                                <FaRegCircle className="text-slate-400 hover:text-slate-300" />
                                                            )}
                                                        </button>

                                                        {hasLink ? (
                                                            <a
                                                                href={problem.leetcode_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs md:text-sm font-bold text-slate-100 hover:text-blue-400 flex items-center gap-1.5 transition"
                                                            >
                                                                <span>{problem.title}</span>
                                                                <FaExternalLinkAlt className="text-[10px] text-slate-400 shrink-0" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs md:text-sm font-bold text-slate-100">{problem.title}</span>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePanel(problemKey, 'hints')}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                                                                isHintsOpen
                                                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                                                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            <FaLightbulb size={12} /> {isHintsOpen ? 'Hide Hints' : 'Hints'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePanel(problemKey, 'answer')}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                                                                isAnswerOpen
                                                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                                                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            <FaCode size={12} /> {isAnswerOpen ? 'Hide Answer' : hasCode ? 'Solution' : 'Answer'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePanel(problemKey, 'submission')}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                                                                isSubmissionOpen
                                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                                    : savedCode
                                                                    ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/60'
                                                                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            <FaLaptopCode size={12} /> {isSubmissionOpen ? 'Hide' : `${hasCode ? 'My Code' : 'My Notes'}${savedCode ? ' ✓' : ''}`}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Hints Section */}
                                                {isHintsOpen && (
                                                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs">
                                                        <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                                                            <FaLightbulb /> Key Hints
                                                        </h4>
                                                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                                                            {guide.hints.map((hint, idx) => (
                                                                <li key={idx}>{hint}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Solution Strategy Section */}
                                                {isAnswerOpen && (
                                                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-blue-500/20 text-xs space-y-3">
                                                        <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                                                            <FaCode /> {hasCode ? 'Solution Strategy' : 'Model Answer'}
                                                        </h4>
                                                        {guide.explanation && !guide.answer_md && (
                                                            <div className="markdown-body text-slate-300">
                                                                <ReactMarkdown>{guide.explanation}</ReactMarkdown>
                                                            </div>
                                                        )}
                                                        {guide.answer_md && (
                                                            <div className="markdown-body text-slate-300 space-y-2">
                                                                <ReactMarkdown>{guide.answer_md}</ReactMarkdown>
                                                            </div>
                                                        )}

                                                        {hasCode && (
                                                        <div className="rounded-xl overflow-hidden border border-slate-800">
                                                            <div className="flex bg-slate-900 border-b border-slate-800">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setLang(problemKey, 'javascript')}
                                                                    className={`px-4 py-1.5 text-xs font-semibold ${
                                                                        currentLang === 'javascript'
                                                                            ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                                                                            : 'text-slate-400 hover:text-slate-200'
                                                                    }`}
                                                                >
                                                                    JavaScript
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setLang(problemKey, 'python')}
                                                                    className={`px-4 py-1.5 text-xs font-semibold ${
                                                                        currentLang === 'python'
                                                                            ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                                                                            : 'text-slate-400 hover:text-slate-200'
                                                                    }`}
                                                                >
                                                                    Python
                                                                </button>
                                                            </div>
                                                            <div className="p-3 bg-slate-950 font-mono text-[11px] overflow-x-auto">
                                                                {currentLang === 'javascript' ? (
                                                                    <ReactMarkdown>{`\`\`\`javascript\n${guide.javascript}\n\`\`\``}</ReactMarkdown>
                                                                ) : (
                                                                    <ReactMarkdown>{`\`\`\`python\n${guide.python}\n\`\`\``}</ReactMarkdown>
                                                                )}
                                                            </div>
                                                        </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* My Saved Submission Drawer */}
                                                {isSubmissionOpen && (
                                                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 text-xs space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                                                                <FaLaptopCode /> My Saved Submission Code
                                                            </h4>
                                                            {savedAt && (
                                                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                                    <FaHistory className="text-[10px]" />
                                                                    {new Date(savedAt).toLocaleDateString(undefined, {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {savedCode ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                                                                    <span className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider font-semibold">
                                                                        {savedLang}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopyCode(problemKey, savedCode)}
                                                                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 transition"
                                                                    >
                                                                        {copiedKey === problemKey ? (
                                                                            <>
                                                                                <FaCheck className="text-emerald-400" /> Copied
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <FaCopy /> Copy
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>

                                                                <div className="p-3 bg-slate-950 font-mono text-[11px] rounded-lg border border-slate-800 overflow-x-auto text-emerald-100 whitespace-pre">
                                                                    {savedCode}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-300 text-xs space-y-1">
                                                                <p className="font-semibold text-emerald-400">
                                                                    {isSolved ? `✓ Solved (${savedLang || 'LeetCode Sync'})` : 'No Code Saved Yet'}
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                                                    {isSolved
                                                                        ? "Your solved status was synced from LeetCode. Public LeetCode APIs sync your solved status & language, but hide private code for security. Paste your solution code below to store it in your AlgoTrack cloud notes!"
                                                                        : "No submitted code recorded yet. Paste your solution below from LeetCode or GeeksForGeeks to store in your AlgoTrack cloud progress."}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Code Paste / Edit Box */}
                                                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[11px] font-semibold text-slate-300">
                                                                    {savedCode ? 'Update / Replace Submitted Code:' : 'Paste Your Submitted Solution:'}
                                                                </label>
                                                                <select
                                                                    value={userLangInput[problemKey] || savedLang || 'python'}
                                                                    onChange={(e) =>
                                                                        setUserLangInput((prev) => ({ ...prev, [problemKey]: e.target.value }))
                                                                    }
                                                                    className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                                                                >
                                                                    <option value="python">Python</option>
                                                                    <option value="javascript">JavaScript</option>
                                                                    <option value="cpp">C++</option>
                                                                    <option value="java">Java</option>
                                                                </select>
                                                            </div>

                                                            <textarea
                                                                rows={5}
                                                                value={userCodeInput[problemKey] ?? savedCode ?? ''}
                                                                onChange={(e) =>
                                                                    setUserCodeInput((prev) => ({ ...prev, [problemKey]: e.target.value }))
                                                                }
                                                                placeholder="def solution():&#10;    # Paste your submitted code here..."
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() => void handleSaveCode(problemKey, problem.title, problem.id)}
                                                                className={`px-3.5 py-1.5 font-semibold rounded-lg text-xs transition inline-flex items-center gap-1.5 shadow-lg ${
                                                                    saveSuccessKey === problemKey
                                                                        ? 'bg-emerald-500 text-white shadow-emerald-900/50'
                                                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                                                                }`}
                                                            >
                                                                {saveSuccessKey === problemKey ? <FaCheck /> : <FaSave />}
                                                                {saveSuccessKey === problemKey ? 'Saved Code ✓' : 'Save Code & Mark Solved'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                    </div>
                </div>

                {/* Wide screens: "On this page" rail; text column stays at a comfortable reading width */}
                {sections.length > 2 && (
                    <nav aria-label="On this page" className="hidden xl:block w-52 shrink-0 sticky top-0 self-start max-h-[calc(100vh-220px)] overflow-y-auto py-1">
                        <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">On this page</p>
                        {sections.map((sec) => (
                            <button
                                key={sec.title}
                                type="button"
                                onClick={() => jumpTo(sec.title)}
                                aria-current={sec.title === current ? 'location' : undefined}
                                className={`block w-full text-left rounded-lg py-1.5 pr-2 text-xs leading-snug border-l-2 transition ${sec.level === 2 ? 'pl-5' : 'pl-2.5 font-semibold'} ${
                                    sec.title === current ? 'border-indigo-400 bg-indigo-500/10 text-white' : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                <span className="line-clamp-2">{sec.title}</span>
                            </button>
                        ))}
                    </nav>
                )}
            </div>
        </section>
        {/* Outside the section: its backdrop-blur would make a fixed child position relative to the card. */}
        {showTop && (
            <button
                type="button"
                onClick={backToTop}
                className="fixed bottom-20 md:bottom-5 right-5 z-30 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/50"
            >
                <FaArrowUp size={11} /> Back to top
            </button>
        )}
        {sheetOpen && (
            <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Lesson sections">
                <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close sections" onClick={() => setSheetOpen(false)} />
                <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-slate-900 border-t border-slate-700 p-4 pb-8">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700" />
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 truncate">{selectedPattern.name}</p>
                        <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="p-1.5 text-slate-400 hover:text-white"><FaTimes /></button>
                    </div>
                    <nav className="space-y-0.5">
                        {sections.map((sec) => (
                            <button
                                key={sec.title}
                                type="button"
                                onClick={() => jumpTo(sec.title)}
                                aria-current={sec.title === current ? 'location' : undefined}
                                className={`w-full text-left rounded-xl py-2.5 pr-3 ${sec.level === 2 ? 'pl-7 text-[13px]' : 'pl-3 text-sm font-semibold'} ${
                                    sec.title === current ? 'bg-indigo-500/20 text-white' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                            >
                                {sec.title}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        )}
        </>
    );
};
