import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { countThisWeek, firstReview, afterReview, isDue, RevisionState, streak as streakOf, today } from '../services/studyDates';

// Roadmap ticks ("roadmap:<item id>") and completed lessons ("lesson:<slug>") store the day they happened
// (older entries store true). Also: best quiz scores ("quiz:<slug>"), study days ("activity:days") and the
// spaced-revision schedule ("revision:<slug>").
// Guests keep them in localStorage; on sign-in they are merged into the account.

export type QuizScore = { best: number; total: number };
type Entries = Record<string, unknown>;

type LearningContextType = {
    isDone: (roadmapItemId: string) => boolean;
    toggleDone: (roadmapItemId: string) => void;
    quizScore: (slug: string) => QuizScore | null;
    recordQuiz: (slug: string, score: number, total: number) => void;
    isLessonDone: (slug: string) => boolean;
    toggleLessonDone: (slug: string) => void;
    streak: number;
    weekDone: number;     // roadmap items + lessons completed this week
    weeklyGoal: number;
    studiedToday: boolean;
    dueRevisions: string[]; // slugs whose recap is due
    revisionState: (slug: string) => RevisionState | null;
    completeRevision: (slug: string) => void;
};

export const WEEKLY_GOAL = 3;
const MAX_DAYS = 120;

const STORAGE_KEY = 'algotrack_learning';
const LearningContext = createContext<LearningContextType | undefined>(undefined);

function readLocal(): Entries {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function writeLocal(entries: Entries) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // storage full or blocked — progress still works for this session
    }
}

export const LearningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<Entries>(readLocal);
    const signedIn = Boolean(user);

    useEffect(() => {
        if (!signedIn) {
            setEntries(readLocal());
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const local = readLocal();
                let remote = await api.getLearning();
                const toUpload: Entries = {};
                for (const [key, value] of Object.entries(local)) {
                    if (key === 'activity:days') {
                        const merged = [...new Set([...((remote[key] as string[]) ?? []), ...(value as string[])])].sort().slice(-MAX_DAYS);
                        if (merged.length !== ((remote[key] as string[]) ?? []).length) toUpload[key] = merged;
                    } else if (key.startsWith('quiz:')) {
                        const mine = value as QuizScore;
                        const theirs = remote[key] as QuizScore | undefined;
                        if (!theirs || mine.best > theirs.best) toUpload[key] = mine;
                    } else if (!(key in remote)) {
                        toUpload[key] = value;
                    }
                }
                if (Object.keys(toUpload).length > 0) remote = await api.updateLearning(toUpload);
                localStorage.removeItem(STORAGE_KEY);
                if (!cancelled) setEntries(remote);
            } catch (err) {
                console.warn('Could not sync learning progress:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [signedIn]);

    const save = useCallback((key: string, value: unknown) => {
        setEntries((prev) => {
            const next = { ...prev };
            if (value === null) delete next[key];
            else next[key] = value;
            if (!signedIn) writeLocal(next);
            return next;
        });
        if (signedIn) {
            api.updateLearning({ [key]: value }).catch((err) => console.warn('Could not save learning progress:', err));
        }
    }, [signedIn]);

    const days = (entries['activity:days'] as string[] | undefined) ?? [];
    const markStudied = () => {
        const day = today();
        if (!days.includes(day)) save('activity:days', [...days, day].sort().slice(-MAX_DAYS));
    };

    const isDone = (id: string) => Boolean(entries[`roadmap:${id}`]);
    const toggleDone = (id: string) => {
        if (isDone(id)) return save(`roadmap:${id}`, null);
        save(`roadmap:${id}`, today());
        markStudied();
    };
    const quizScore = (slug: string) => (entries[`quiz:${slug}`] as QuizScore | undefined) ?? null;
    const revisionState = (slug: string) => (entries[`revision:${slug}`] as RevisionState | undefined) ?? null;
    const recordQuiz = (slug: string, score: number, total: number) => {
        const prev = quizScore(slug);
        if (!prev || score > prev.best) save(`quiz:${slug}`, { best: score, total });
        if (!revisionState(slug)) save(`revision:${slug}`, firstReview()); // first finish → recap in 3 days
        markStudied();
    };
    const completeRevision = (slug: string) => {
        const state = revisionState(slug) ?? firstReview();
        save(`revision:${slug}`, afterReview(state));
        markStudied();
    };

    const isLessonDone = (slug: string) => Boolean(entries[`lesson:${slug}`]);
    const toggleLessonDone = (slug: string) => {
        if (isLessonDone(slug)) return save(`lesson:${slug}`, null);
        save(`lesson:${slug}`, today());
        markStudied();
    };

    const completedDates = Object.entries(entries)
        .filter(([k, v]) => (k.startsWith('roadmap:') || k.startsWith('lesson:')) && typeof v === 'string')
        .map(([, v]) => v as string);
    const dueRevisions = Object.entries(entries)
        .filter(([k, v]) => k.startsWith('revision:') && isDue(v as RevisionState))
        .map(([k]) => k.slice('revision:'.length));

    return (
        <LearningContext.Provider
            value={{
                isDone, toggleDone, quizScore, recordQuiz, isLessonDone, toggleLessonDone,
                streak: streakOf(days), weekDone: countThisWeek(completedDates), weeklyGoal: WEEKLY_GOAL,
                studiedToday: days.includes(today()), dueRevisions, revisionState, completeRevision,
            }}
        >
            {children}
        </LearningContext.Provider>
    );
};

export const useLearning = (): LearningContextType => {
    const ctx = useContext(LearningContext);
    if (!ctx) throw new Error('useLearning must be used within a LearningProvider');
    return ctx;
};
