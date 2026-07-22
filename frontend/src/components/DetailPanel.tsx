import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PatternDetail, ProblemGuide } from '../types';
import { useAuth } from '../context/AuthContext';
import { FaCheckCircle, FaRegCircle, FaExternalLinkAlt, FaLightbulb, FaCode } from 'react-icons/fa';

type DetailPanelProps = {
    selectedPattern: PatternDetail | null;
};

export const DetailPanel: React.FC<DetailPanelProps> = ({ selectedPattern }) => {
    const { userProgress, toggleProblemSolved } = useAuth();
    const [expandedPanels, setExpandedPanels] = useState<Record<string, 'hints' | 'answer' | null>>({});
    const [activeLangTab, setActiveLangTab] = useState<Record<string, 'python' | 'javascript'>>({});

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

    const togglePanel = (problemKey: string, panel: 'hints' | 'answer') => {
        setExpandedPanels((current) => ({
            ...current,
            [problemKey]: current[problemKey] === panel ? null : panel,
        }));
    };

    const setLang = (problemKey: string, lang: 'python' | 'javascript') => {
        setActiveLangTab((prev) => ({ ...prev, [problemKey]: lang }));
    };

    return (
        <section className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1 space-y-6">
                {/* Topic Title Header */}
                <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-1">{selectedPattern.name}</h2>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{selectedPattern.description}</p>
                </div>

                {/* Revision Notes Markdown Card */}
                {selectedPattern.revision_note_md && (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 md:p-5 prose prose-invert max-w-none text-xs md:text-sm">
                        <h3 className="text-sm md:text-base font-bold text-blue-400 mb-3 mt-0">Revision Notes & Mindmap</h3>
                        <div className="markdown-body">
                            <ReactMarkdown>{selectedPattern.revision_note_md}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Problem Tiers */}
                <div className="space-y-6">
                    {Object.entries(selectedPattern.problems_by_tier).map(([tier, problems]) => (
                        <div key={tier} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 md:p-5">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2.5">
                                <h3 className="text-sm md:text-base font-bold text-slate-200 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    Tier {tier} Problems
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/60 px-2.5 py-0.5 rounded-full border border-slate-700">
                                    {problems.length} {problems.length === 1 ? 'Problem' : 'Problems'}
                                </span>
                            </div>

                            <ul className="space-y-3">
                                {problems.map((problem) => {
                                    const problemKey = `${problem.title}-${problem.leetcode_number ?? 'na'}`;
                                    const guide: ProblemGuide = problem.guide ?? {
                                        hints: ['Read the problem statement carefully and identify the core pattern.'],
                                        explanation: 'Use a structured approach to break the problem into smaller steps before coding the solution.',
                                        python: '# Add a Python solution here',
                                        javascript: '// Add a JavaScript solution here',
                                    };

                                    const isSolved = userProgress[problem.title] === 'solved';
                                    const isHintsOpen = expandedPanels[problemKey] === 'hints';
                                    const isAnswerOpen = expandedPanels[problemKey] === 'answer';
                                    const currentLang = activeLangTab[problemKey] || 'javascript';

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
                                                        <span>{problem.leetcode_number ? `#${problem.leetcode_number} ` : ''}{problem.title}</span>
                                                        <FaExternalLinkAlt className="text-[10px] text-slate-500 shrink-0" />
                                                    </a>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePanel(problemKey, 'hints')}
                                                        className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
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
                                                        className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                                                            isAnswerOpen
                                                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                        }`}
                                                    >
                                                        <FaCode size={12} /> {isAnswerOpen ? 'Hide Answer' : 'Answer'}
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

                                            {/* Answer Section */}
                                            {isAnswerOpen && (
                                                <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-blue-500/20 text-xs space-y-3">
                                                    <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                                                        <FaCode /> Solution Strategy
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
