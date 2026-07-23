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
    login: (username: string, pass: string) => Promise<User>;
    register: (username: string, email: string, pass: string) => Promise<User>;
    unifiedEmailAuth: (email: string, pass?: string, username?: string) => Promise<User>;
    githubLogin: (payload?: { code?: string; redirectUri?: string; githubUsername?: string } | string) => Promise<User>;
    googleLogin: (payload: { code?: string; redirectUri?: string; email?: string; name?: string }) => Promise<User>;
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

                    // If user has leetcode handle, auto sync on session restore silently
                    if (currentUser.leetcode_username) {
                        void api.syncLeetCode(currentUser.leetcode_username).then((res) => {
                            setUser((prev) => (prev ? { ...prev, solved_count: res.total_solved_count } : null));
                            return api.getProgress().then((p) => setUserProgress(p));
                        }).catch(() => {});
                    }
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

    const handleAuthSuccess = async (authToken: string, authUser: User): Promise<User> => {
        setToken(authToken);
        setUser(authUser);
        localStorage.setItem('dsa_tracker_token', authToken);

        try {
            const prog = await api.getProgress();
            setUserProgress(prog);

            if (authUser.leetcode_username) {
                try {
                    const syncRes = await api.syncLeetCode(authUser.leetcode_username);
                    const refreshedProg = await api.getProgress();
                    setUserProgress(refreshedProg);
                    authUser = { ...authUser, solved_count: syncRes.total_solved_count };
                    setUser(authUser);
                } catch (syncErr) {
                    console.warn('Auto-sync LeetCode questions failed:', syncErr);
                }
            }
        } catch (err) {
            console.warn('Could not sync user progress', err);
        }
        return authUser;
    };

    const login = async (username: string, pass: string): Promise<User> => {
        const res = await api.login(username, pass);
        return await handleAuthSuccess(res.token, res.user);
    };

    const register = async (username: string, email: string, pass: string): Promise<User> => {
        const res = await api.register(username, email, pass);
        return await handleAuthSuccess(res.token, res.user);
    };

    const unifiedEmailAuth = async (email: string, pass?: string, username?: string): Promise<User> => {
        const res = await api.unifiedEmailAuth(email, pass, username);
        return await handleAuthSuccess(res.token, res.user);
    };

    const githubLogin = async (payload?: { code?: string; redirectUri?: string; githubUsername?: string } | string): Promise<User> => {
        const res = await api.githubAuth(payload || {});
        return await handleAuthSuccess(res.token, res.user);
    };

    const googleLogin = async (payload: { code?: string; redirectUri?: string; email?: string; name?: string }): Promise<User> => {
        const res = await api.googleAuth(payload);
        return await handleAuthSuccess(res.token, res.user);
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
                register,
                unifiedEmailAuth,
                githubLogin,
                googleLogin,
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
