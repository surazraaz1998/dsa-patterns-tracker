import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PatternDetail, ProblemGuide } from '../types';
import { useAuth } from '../context/AuthContext';
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
    FaHistory
} from 'react-icons/fa';

type DetailPanelProps = {
    selectedPattern: PatternDetail | null;
};

export const DetailPanel: React.FC<DetailPanelProps> = ({ selectedPattern }) => {
    const { getProblemStatus, getProblemProgress, toggleProblemSolved, saveSubmittedCode } = useAuth();
    const [expandedPanels, setExpandedPanels] = useState<Record<string, 'hints' | 'answer' | 'submission' | null>>({});
    const [activeLangTab, setActiveLangTab] = useState<Record<string, 'python' | 'javascript'>>({});
    const [userCodeInput, setUserCodeInput] = useState<Record<string, string>>({});
    const [userLangInput, setUserLangInput] = useState<Record<string, string>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [saveSuccessKey, setSaveSuccessKey] = useState<string | null>(null);

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
        <section className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1 space-y-6">
                {/* Topic Title Header */}
                <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-1">{selectedPattern.name}</h2>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{selectedPattern.description}</p>
                </div>

                {/* Illustrative Pattern Overview & Solving Strategy */}
                {selectedPattern.revision_note_md && (
                    <div className="bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 border border-blue-500/20 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4">
                        {/* Header Badge & Title */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                                    <FaBrain className="text-base" />
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-bold text-white tracking-wide">
                                        Pattern Mental Blueprint & Solving Strategy
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Master the intuition, decision triggers, and standard code structure before attempting problems.
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
                <div className="space-y-6">
                    {Object.entries(selectedPattern.problems_by_tier || {}).map(([tier, problems = []]) => (
                        <div key={tier} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 md:p-5">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2.5">
                                <h3 className="text-sm md:text-base font-bold text-slate-200 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    Tier {tier} Problems
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/60 px-2.5 py-0.5 rounded-full border border-slate-700">
                                    {(problems || []).length} {(problems || []).length === 1 ? 'Problem' : 'Problems'}
                                </span>
                            </div>

                            <ul className="space-y-3">
                                {(problems || []).map((problem) => {
                                    const problemKey = `${problem.title}-${problem.leetcode_number ?? 'na'}`;
                                    const guide: ProblemGuide = problem.guide ?? {
                                        hints: ['Read the problem statement carefully and identify the core pattern.'],
                                        explanation: 'Use a structured approach to break the problem into smaller steps before coding the solution.',
                                        python: '# Add a Python solution here',
                                        javascript: '// Add a JavaScript solution here',
                                    };

                                    const pStatus = getProblemStatus(problem.title);
                                    const pProgress = getProblemProgress(problem.title);
                                    const isSolved = pStatus === 'solved';
                                    const isHintsOpen = expandedPanels[problemKey] === 'hints';
                                    const isAnswerOpen = expandedPanels[problemKey] === 'answer';
                                    const isSubmissionOpen = expandedPanels[problemKey] === 'submission';
                                    const currentLang = activeLangTab[problemKey] || 'javascript';
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
                                                            <FaRegCircle className="text-slate-500 hover:text-slate-300" />
                                                        )}
                                                    </button>

                                                    <a
                                                        href={problem.leetcode_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs md:text-sm font-bold text-slate-100 hover:text-blue-400 flex items-center gap-1.5 transition"
                                                    >
                                                        <span>{problem.title}</span>
                                                        <FaExternalLinkAlt className="text-[10px] text-slate-500 shrink-0" />
                                                    </a>
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
                                                        <FaCode size={12} /> {isAnswerOpen ? 'Hide Solution' : 'Solution'}
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
                                                        <FaLaptopCode size={12} /> {isSubmissionOpen ? 'Hide Code' : savedCode ? 'My Code ✓' : 'My Code'}
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
                                                        <FaCode /> Official Solution Strategy
                                                    </h4>
                                                    <div className="markdown-body text-slate-300">
                                                        <ReactMarkdown>{guide.explanation}</ReactMarkdown>
                                                    </div>

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
                    ))}
                </div>
            </div>
        </section>
    );
};
