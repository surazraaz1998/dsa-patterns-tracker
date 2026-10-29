import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

// Roadmap checkboxes ("roadmap:<item id>") and best quiz scores ("quiz:<topic slug>").
// Guests keep them in localStorage; on sign-in they are merged into the account.

export type QuizScore = { best: number; total: number };
type Entries = Record<string, unknown>;

type LearningContextType = {
    isDone: (roadmapItemId: string) => boolean;
    toggleDone: (roadmapItemId: string) => void;
    quizScore: (slug: string) => QuizScore | null;
    recordQuiz: (slug: string, score: number, total: number) => void;
};

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
                    if (key.startsWith('quiz:')) {
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

    const isDone = (id: string) => entries[`roadmap:${id}`] === true;
    const toggleDone = (id: string) => save(`roadmap:${id}`, isDone(id) ? null : true);
    const quizScore = (slug: string) => (entries[`quiz:${slug}`] as QuizScore | undefined) ?? null;
    const recordQuiz = (slug: string, score: number, total: number) => {
        const prev = quizScore(slug);
        if (!prev || score > prev.best) save(`quiz:${slug}`, { best: score, total });
    };

    return (
        <LearningContext.Provider value={{ isDone, toggleDone, quizScore, recordQuiz }}>
            {children}
        </LearningContext.Provider>
    );
};

export const useLearning = (): LearningContextType => {
    const ctx = useContext(LearningContext);
    if (!ctx) throw new Error('useLearning must be used within a LearningProvider');
    return ctx;
};
