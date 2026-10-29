import React, { useMemo, useState } from 'react';
import { FaBolt, FaCode, FaExclamationTriangle, FaLightbulb, FaQuestionCircle, FaUserTie } from 'react-icons/fa';
import { useLearning } from '../context/LearningContext';
import { isDue, today } from '../services/studyDates';
import { Lesson, QuizQuestion } from '../types';
import { BulletList, Markdown, Quiz, Section } from './LessonView';

// Same 3 questions all day (so a reload doesn't reshuffle), different ones on other days.
function pickRecap(slug: string, questions: QuizQuestion[], n = 3): QuizQuestion[] {
    let seed = [...`${slug}:${today()}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    return [...questions].sort(() => rand() - 0.5).slice(0, n);
}

const firstParagraph = (md: string) => md.split(/\n\s*\n/)[0];

/** One-page summary of a lesson for the night before an interview, plus the spaced-revision recap. */
export const RevisionView: React.FC<{ slug: string; lesson: Lesson }> = ({ slug, lesson }) => {
    const { revisionState, completeRevision } = useLearning();
    const state = revisionState(slug);
    const due = isDue(state ?? undefined);
    const recap = useMemo(() => pickRecap(slug, lesson.quiz ?? []), [slug, lesson.quiz]);
    const [result, setResult] = useState<string | null>(null);

    const onFinish = (score: number, total: number) => {
        if (due) {
            completeRevision(slug);
            setResult(state && state.step >= 1
                ? `${score}/${total} — that was the last scheduled recap. This one's locked in.`
                : `${score}/${total} — next recap in 7 days.`);
        } else {
            setResult(`${score}/${total}.${state?.due ? ` Your next scheduled recap is on ${state.due}.` : ''}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className={`rounded-2xl border p-4 text-sm ${due ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100'}`}>
                <p className="font-bold flex items-center gap-2"><FaBolt /> {due ? 'Recap due today' : 'Quick revision'}</p>
                <p className="text-xs mt-1 opacity-90">
                    {due
                        ? 'Skim this page, then answer the 3 questions at the bottom to lock the lesson in.'
                        : 'The whole lesson on one page — read it the night before an interview.'}
                </p>
            </div>

            <Section icon={<FaLightbulb />} title="In one line" tone="text-amber-400">
                <div className="markdown-body text-sm text-slate-200 leading-relaxed"><Markdown>{firstParagraph(lesson.simple)}</Markdown></div>
                {lesson.concepts && lesson.concepts.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1.5">Key ideas</p>
                        <BulletList items={lesson.concepts.map((c) => c.title)} />
                    </div>
                )}
                {lesson.key_points && <BulletList items={lesson.key_points} />}
            </Section>

            {lesson.when_to_use && lesson.when_to_use.length > 0 && (
                <Section icon={<FaLightbulb />} title="Spot it" tone="text-amber-400">
                    <BulletList items={lesson.when_to_use} marker="→" />
                </Section>
            )}

            {(lesson.template?.python || lesson.complexity) && (
                <Section icon={<FaCode />} title="Template & complexity" tone="text-violet-400">
                    {lesson.complexity && <p className="text-sm text-slate-200"><strong className="text-slate-100">Complexity: </strong>{lesson.complexity}</p>}
                    {lesson.template?.python && (
                        <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[12px] leading-relaxed text-slate-200 overflow-x-auto"><code>{lesson.template.python}</code></pre>
                    )}
                </Section>
            )}

            {(lesson.mistakes?.length || lesson.interview_tips?.length) ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {lesson.mistakes && lesson.mistakes.length > 0 && (
                        <Section icon={<FaExclamationTriangle />} title="Avoid" tone="text-rose-400"><BulletList items={lesson.mistakes} marker="✗" /></Section>
                    )}
                    {lesson.interview_tips && lesson.interview_tips.length > 0 && (
                        <Section icon={<FaUserTie />} title="Say in the interview" tone="text-emerald-400"><BulletList items={lesson.interview_tips} marker="✓" /></Section>
                    )}
                </div>
            ) : null}

            {recap.length > 0 && (
                <Section icon={<FaQuestionCircle />} title="3-question recap" tone="text-fuchsia-400">
                    <Quiz key={`${slug}-recap`} slug={slug} questions={recap} recordBest={false} onFinish={onFinish} />
                    {result && <p className="text-sm text-emerald-200" role="status">{result}</p>}
                </Section>
            )}
        </div>
    );
};
