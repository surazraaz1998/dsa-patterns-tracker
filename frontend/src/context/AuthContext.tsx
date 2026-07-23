import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { ProblemProgressDetail, ProblemStatus, User, UserProgressMap } from '../types';

type AuthContextType = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    solvedCount: number;
    userProgress: UserProgressMap;
    loading: boolean;
    login: (username: string, pass: string) => Promise<void>;
    loginAsAdmin: () => Promise<void>;
    register: (username: string, email: string, pass: string) => Promise<void>;
    githubLogin: (payload?: { code?: string; githubUsername?: string } | string) => Promise<void>;
    logout: () => void;
    toggleProblemSolved: (problemTitle: string, problemId?: number) => Promise<void>;
    saveSubmittedCode: (problemTitle: string, code: string, language: string, problemId?: number) => Promise<void>;
    syncLeetCode: (leetcodeUsername?: string) => Promise<{ synced_count: number; synced_problems: string[] }>;
    updateProfile: (data: { leetcode_username?: string; gfg_username?: string; avatar_url?: string }) => Promise<void>;
    getProblemStatus: (problemTitle: string) => ProblemStatus;
    getProblemProgress: (problemTitle: string) => ProblemProgressDetail | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_PROGRESS_KEY = 'dsa_tracker_guest_progress';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('dsa_tracker_token'));
    const [userProgress, setUserProgress] = useState<UserProgressMap>({});
    const [loading, setLoading] = useState<boolean>(true);

    // Initial session load
    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem('dsa_tracker_token');
            if (savedToken) {
                try {
                    const currentUser = await api.getCurrentUser(savedToken);
                    setUser(currentUser);
                    setToken(savedToken);

                    // Load DB progress
                    const prog = await api.getProgress();
                    setUserProgress(prog);
                } catch (err) {
                    console.warn('Session expired or backend offline:', err);
                    localStorage.removeItem('dsa_tracker_token');
                    setToken(null);
                    setUser(null);
                    loadLocalGuestProgress();
                }
            } else {
                loadLocalGuestProgress();
            }
            setLoading(false);
        };

        void initAuth();
    }, []);

    const loadLocalGuestProgress = () => {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
            if (raw) {
                setUserProgress(JSON.parse(raw));
            }
        } catch (e) {
            console.error('Error loading guest progress', e);
        }
    };

    const handleAuthSuccess = async (authToken: string, authUser: User) => {
        setToken(authToken);
        setUser(authUser);
        localStorage.setItem('dsa_tracker_token', authToken);

        try {
            const prog = await api.getProgress();
            setUserProgress(prog);
        } catch (err) {
            console.warn('Could not sync user progress', err);
        }
    };

    const login = async (username: string, pass: string) => {
        const res = await api.login(username, pass);
        await handleAuthSuccess(res.token, res.user);
    };

    const loginAsAdmin = async () => {
        await login('Admin', 'Suraz@1998');
    };

    const register = async (username: string, email: string, pass: string) => {
        const res = await api.register(username, email, pass);
        await handleAuthSuccess(res.token, res.user);
    };

    const githubLogin = async (payload: { code?: string; githubUsername?: string } | string = 'surazraaz1998') => {
        const res = await api.githubAuth(payload);
        await handleAuthSuccess(res.token, res.user);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('dsa_tracker_token');
        setUserProgress({});
        loadLocalGuestProgress();
    };

    const getProblemStatus = (problemTitle: string): ProblemStatus => {
        const val = userProgress[problemTitle];
        if (!val) return 'not_started';
        if (typeof val === 'string') return val as ProblemStatus;
        return val.status;
    };

    const getProblemProgress = (problemTitle: string): ProblemProgressDetail | null => {
        const val = userProgress[problemTitle];
        if (!val) return null;
        if (typeof val === 'string') {
            return { status: val as ProblemStatus };
        }
        return val;
    };

    const toggleProblemSolved = async (problemTitle: string, problemId?: number) => {
        const currentStatus = getProblemStatus(problemTitle);
        const newStatus: ProblemStatus = currentStatus === 'solved' ? 'not_started' : 'solved';

        const existingDetail = getProblemProgress(problemTitle);
        const newDetail: ProblemProgressDetail = {
            ...(existingDetail || {}),
            status: newStatus,
        };

        const updatedProgress = { ...userProgress, [problemTitle]: newDetail };
        setUserProgress(updatedProgress);

        if (user && token) {
            try {
                const res = await api.updateProgress(problemTitle, newStatus, problemId);
                setUser((prev) => (prev ? { ...prev, solved_count: res.total_solved_count } : null));
            } catch (err) {
                console.error('Failed to sync progress with database:', err);
            }
        } else {
            localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(updatedProgress));
        }
    };

    const saveSubmittedCode = async (
        problemTitle: string,
        code: string,
        language: string,
        problemId?: number
    ) => {
        const newDetail: ProblemProgressDetail = {
            status: 'solved',
            submitted_code: code,
            submitted_language: language,
            last_submitted_at: new Date().toISOString(),
        };

        const updatedProgress = { ...userProgress, [problemTitle]: newDetail };
        setUserProgress(updatedProgress);

        if (user && token) {
            try {
                const res = await api.updateProgress(problemTitle, 'solved', problemId, code, language);
                setUser((prev) => (prev ? { ...prev, solved_count: res.total_solved_count } : null));
            } catch (err) {
                console.error('Failed to save code to database:', err);
            }
        } else {
            localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(updatedProgress));
        }
    };

    const syncLeetCode = async (leetcodeUsername?: string) => {
        const res = await api.syncLeetCode(leetcodeUsername);
        const refreshedProgress = await api.getProgress();
        setUserProgress(refreshedProgress);
        setUser((prev) => (prev ? { ...prev, solved_count: res.total_solved_count, leetcode_username: leetcodeUsername || prev.leetcode_username } : null));
        return { synced_count: res.synced_count, synced_problems: res.synced_problems };
    };

    const updateProfile = async (data: { leetcode_username?: string; gfg_username?: string; avatar_url?: string }) => {
        const updatedUser = await api.updateProfile(data);
        setUser(updatedUser);
    };

    const solvedCount = user
        ? Object.keys(userProgress).filter((title) => getProblemStatus(title) === 'solved').length || user.solved_count
        : Object.keys(userProgress).filter((title) => getProblemStatus(title) === 'solved').length;

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                solvedCount,
                userProgress,
                loading,
                login,
                loginAsAdmin,
                register,
                githubLogin,
                logout,
                toggleProblemSolved,
                saveSubmittedCode,
                syncLeetCode,
                updateProfile,
                getProblemStatus,
                getProblemProgress,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
