import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaBookOpen, FaLightbulb, FaRoute, FaCode, FaExclamationTriangle, FaUserTie, FaQuestionCircle, FaExternalLinkAlt, FaCheck, FaTimes, FaRedo, FaLayerGroup } from 'react-icons/fa';
import { useLearning } from '../context/LearningContext';
import { smooth } from '../services/prefs';
import { Concept, Lesson, QuizQuestion } from '../types';
import { VisualFor } from '../visuals';
import { VideoClips } from './VideoClips';

export const Markdown: React.FC<{ children: string }> = ({ children }) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
);

const DeepDive: React.FC<{ concepts: Concept[] }> = ({ concepts }) => {
    const refs = useRef<(HTMLElement | null)[]>([]);
    return (
        <Section icon={<FaLayerGroup />} title="Deep dive" tone="text-indigo-400">
            <ol className="flex flex-wrap gap-1.5 text-xs">
                {concepts.map((c, i) => (
                    <li key={c.title}>
                        <button
                            type="button"
                            onClick={() => refs.current[i]?.scrollIntoView({ behavior: smooth(), block: 'start' })}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-indigo-600/30 hover:text-white transition"
                        >
                            {i + 1}. {c.title}
                            {c.visual && <span className="ml-1" aria-label="has a visualisation">📊</span>}
                            {c.videos?.length ? <span className="ml-0.5 text-red-400" aria-label="has a video">▶</span> : null}
                        </button>
                    </li>
                ))}
            </ol>
            <div className="space-y-5 pt-1">
                {concepts.map((c, i) => (
                    <article key={c.title} ref={(el) => { refs.current[i] = el; }} data-section={`${i + 1}. ${c.title}`} data-section-level="2" className="scroll-mt-32 md:scroll-mt-4">
                        <h4 className="text-[15px] font-bold text-white mb-2">
                            <span className="text-indigo-400 mr-1.5">{i + 1}.</span>{c.title}
                        </h4>
                        {c.videos && c.videos.length > 0 && (
                            <div className="mb-3"><VideoClips clips={c.videos} sectionTitle={c.title} /></div>
                        )}
                        <div className="markdown-body text-sm text-slate-200 leading-relaxed">
                            <Markdown>{c.body}</Markdown>
                        </div>
                        {c.visual && <div className="mt-3"><VisualFor visual={c.visual} /></div>}
                    </article>
                ))}
            </div>
        </Section>
    );
};

export const Section: React.FC<{ icon: React.ReactNode; title: string; tone?: string; children: React.ReactNode }> = ({ icon, title, tone = 'text-blue-400', children }) => (
    <section data-section={title} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3 scroll-mt-32 md:scroll-mt-4">
        <h3 className={`text-sm font-bold flex items-center gap-2 ${tone}`}>
            {icon} {title}
        </h3>
        {children}
    </section>
);

export const BulletList: React.FC<{ items: string[]; marker?: string }> = ({ items, marker = '•' }) => (
    <ul className="space-y-1.5 text-sm text-slate-300">
        {items.map((text, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
                <span className="text-slate-400 shrink-0">{marker}</span>
                <span className="markdown-inline"><ReactMarkdown>{text}</ReactMarkdown></span>
            </li>
        ))}
    </ul>
);

// recordBest=false for revision recaps (a 3-question recap mustn't replace the full quiz's best score).
export const Quiz: React.FC<{
    slug: string;
    questions: QuizQuestion[];
    recordBest?: boolean;
    onFinish?: (score: number, total: number) => void;
}> = ({ slug, questions, recordBest = true, onFinish }) => {
    const { quizScore, recordQuiz } = useLearning();
    const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
    const answered = picked.filter((p) => p !== null).length;
    const score = picked.filter((p, i) => p === questions[i]?.answer).length;
    const finished = answered === questions.length;
    const best = quizScore(slug);

    useEffect(() => {
        if (!finished) return;
        if (recordBest) recordQuiz(slug, score, questions.length);
        onFinish?.(score, questions.length);
        // record once when the last answer is picked
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finished]);

    return (
        <div className="space-y-4">
            {questions.map((q, qi) => {
                const choice = picked[qi];
                return (
                    <div key={qi} className="space-y-2">
                        <p className="text-sm font-semibold text-slate-100">{qi + 1}. {q.q}</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oi) => {
                                const isCorrect = oi === q.answer;
                                const state = choice === null ? 'idle' : isCorrect ? 'correct' : choice === oi ? 'wrong' : 'dim';
                                return (
                                    <button
                                        key={oi}
                                        type="button"
                                        disabled={choice !== null}
                                        onClick={() => setPicked((prev) => prev.map((p, i) => (i === qi ? oi : p)))}
                                        className={`text-left px-3 py-2 rounded-xl border text-sm transition flex items-center justify-between gap-2 ${
                                            state === 'idle' ? 'border-slate-700 bg-slate-900 hover:border-blue-500 text-slate-200'
                                                : state === 'correct' ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                                                : state === 'wrong' ? 'border-rose-500/60 bg-rose-500/10 text-rose-200'
                                                : 'border-slate-800 bg-slate-900/50 text-slate-400'
                                        }`}
                                    >
                                        <span>{opt}</span>
                                        {state === 'correct' && <FaCheck className="shrink-0" />}
                                        {state === 'wrong' && <FaTimes className="shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                        {choice !== null && (
                            <p className={`text-xs leading-relaxed ${choice === q.answer ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {choice === q.answer ? 'Correct. ' : 'Not quite. '}{q.why}
                            </p>
                        )}
                    </div>
                );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-sm">
                <span className="text-slate-300">
                    {finished ? <>Score: <strong className="text-white">{score} / {questions.length}</strong></> : `${answered} of ${questions.length} answered`}
                    {recordBest && best && <span className="text-slate-400"> · best {best.best}/{best.total}</span>}
                </span>
                {finished && (
                    <button type="button" onClick={() => setPicked(questions.map(() => null))} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300">
                        <FaRedo size={10} /> Try again
                    </button>
                )}
            </div>
        </div>
    );
};

const CompleteCard: React.FC<{ slug: string }> = ({ slug }) => {
    const { isLessonDone, toggleLessonDone, quizScore } = useLearning();
    const done = isLessonDone(slug);
    const score = quizScore(slug);
    return (
        <div className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${done ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
            <div className="text-sm">
                <p className="font-bold text-white">{done ? 'Lesson completed' : 'Finished this lesson?'}</p>
                <p className="text-xs text-slate-400">
                    {score ? `Best quiz score: ${score.best}/${score.total}. ` : done ? '' : 'Try the quiz above first. '}
                    {done ? 'It shows as done in the topic list.' : 'Mark it complete to track your progress.'}
                </p>
            </div>
            <button
                type="button"
                onClick={() => toggleLessonDone(slug)}
                aria-pressed={done}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                    done ? 'bg-transparent border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
            >
                <FaCheck size={12} /> {done ? 'Completed — undo' : 'Mark lesson complete'}
            </button>
        </div>
    );
};

export const LessonView: React.FC<{ slug: string; lesson: Lesson }> = ({ slug, lesson }) => {
    const [lang, setLang] = useState<'python' | 'javascript'>('python');
    const isOutline = lesson.status === 'outline';
    const { isLessonDone } = useLearning();

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {lesson.week && <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">Roadmap weeks {lesson.week}</span>}
                <span className={`px-2.5 py-1 rounded-full border font-semibold ${isOutline ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                    {isOutline ? 'Outline · full lesson coming soon' : 'Full lesson'}
                </span>
                {isLessonDone(slug) && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white font-semibold inline-flex items-center gap-1"><FaCheck size={9} /> Completed</span>
                )}
            </div>

            <Section icon={<FaBookOpen />} title="In simple words">
                <div className="markdown-body text-sm text-slate-200 leading-relaxed space-y-2">
                    <Markdown>{lesson.simple}</Markdown>
                </div>
                {lesson.analogy && (
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-sm text-amber-100 leading-relaxed">
                        <strong className="text-amber-300">Think of it like this: </strong>{lesson.analogy}
                    </div>
                )}
            </Section>

            {lesson.concepts && lesson.concepts.length > 0 && <DeepDive concepts={lesson.concepts} />}

            {lesson.key_points && lesson.key_points.length > 0 && (
                <Section icon={<FaLightbulb />} title="Key points" tone="text-amber-400">
                    <BulletList items={lesson.key_points} />
                </Section>
            )}

            {lesson.when_to_use && lesson.when_to_use.length > 0 && (
                <Section icon={<FaLightbulb />} title="When to use it" tone="text-amber-400">
                    <BulletList items={lesson.when_to_use} marker="→" />
                </Section>
            )}

            {lesson.dry_run && (
                <Section icon={<FaRoute />} title={`Dry run: ${lesson.dry_run.title}`} tone="text-cyan-400">
                    <p className="text-xs text-slate-400 font-mono">{lesson.dry_run.input}</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-900 text-slate-400">
                                <tr>{lesson.dry_run.columns.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c}</th>)}</tr>
                            </thead>
                            <tbody>
                                {lesson.dry_run.steps.map((row, i) => (
                                    <tr key={i} className="border-t border-slate-800 text-slate-200">
                                        {row.map((cell, j) => <td key={j} className="px-3 py-2 font-mono align-top">{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-cyan-100"><strong className="text-cyan-300">Takeaway: </strong>{lesson.dry_run.takeaway}</p>
                </Section>
            )}

            {lesson.template && (lesson.template.python || lesson.template.javascript) && (
                <Section icon={<FaCode />} title="Template" tone="text-violet-400">
                    <div className="flex gap-1">
                        {(['python', 'javascript'] as const).filter((l) => lesson.template?.[l]).map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => setLang(l)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold ${lang === l ? 'bg-violet-500/20 text-violet-200' : 'text-slate-400 hover:text-white'}`}
                            >
                                {l === 'python' ? 'Python' : 'JavaScript'}
                            </button>
                        ))}
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[12px] leading-relaxed text-slate-200 overflow-x-auto"><code>{lesson.template[lang] || lesson.template.python || lesson.template.javascript}</code></pre>
                    {lesson.complexity && <p className="text-xs text-slate-400"><strong className="text-slate-300">Complexity: </strong>{lesson.complexity}</p>}
                </Section>
            )}

            {(lesson.mistakes?.length || lesson.interview_tips?.length) ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {lesson.mistakes && lesson.mistakes.length > 0 && (
                        <Section icon={<FaExclamationTriangle />} title="Common mistakes" tone="text-rose-400">
                            <BulletList items={lesson.mistakes} marker="✗" />
                        </Section>
                    )}
                    {lesson.interview_tips && lesson.interview_tips.length > 0 && (
                        <Section icon={<FaUserTie />} title="In the interview" tone="text-emerald-400">
                            <BulletList items={lesson.interview_tips} marker="✓" />
                        </Section>
                    )}
                </div>
            ) : null}

            {lesson.quiz && lesson.quiz.length > 0 && (
                <Section icon={<FaQuestionCircle />} title="Check yourself" tone="text-fuchsia-400">
                    {/* keyed so answers reset when the lesson changes */}
                    <Quiz key={slug} slug={slug} questions={lesson.quiz} />
                </Section>
            )}

            {lesson.resources && lesson.resources.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-slate-400 py-1">Go deeper:</span>
                    {lesson.resources.map((r) => r.url ? (
                        <a key={r.label} href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-blue-500">
                            {r.label} <FaExternalLinkAlt size={9} />
                        </a>
                    ) : (
                        <span key={r.label} className="px-2.5 py-1 rounded-full border border-slate-800 text-slate-400">{r.label}</span>
                    ))}
                </div>
            )}

            <CompleteCard slug={slug} />
        </div>
    );
};
