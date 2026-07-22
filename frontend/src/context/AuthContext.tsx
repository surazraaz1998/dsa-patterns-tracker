import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { ProblemStatus, User } from '../types';

type AuthContextType = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    solvedCount: number;
    userProgress: Record<string, ProblemStatus>;
    loading: boolean;
    login: (username: string, pass: string) => Promise<void>;
    loginAsAdmin: () => Promise<void>;
    register: (username: string, email: string, pass: string) => Promise<void>;
    githubLogin: (username?: string) => Promise<void>;
    logout: () => void;
    toggleProblemSolved: (problemTitle: string, problemId?: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_PROGRESS_KEY = 'dsa_tracker_guest_progress';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('dsa_tracker_token'));
    const [userProgress, setUserProgress] = useState<Record<string, ProblemStatus>>({});
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
                    // Load local guest progress fallback
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

    const githubLogin = async (username: string = 'surazraaz1998') => {
        const avatarUrl = `https://github.com/${username}.png`;
        const res = await api.githubAuth(username, `${username.toLowerCase()}@users.noreply.github.com`, avatarUrl);
        await handleAuthSuccess(res.token, res.user);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('dsa_tracker_token');
        setUserProgress({});
        loadLocalGuestProgress();
    };

    const toggleProblemSolved = async (problemTitle: string, problemId?: number) => {
        const currentStatus = userProgress[problemTitle] || 'not_started';
        const newStatus: ProblemStatus = currentStatus === 'solved' ? 'not_started' : 'solved';

        // Optimistic UI update
        const updatedProgress = { ...userProgress, [problemTitle]: newStatus };
        setUserProgress(updatedProgress);

        if (user && token) {
            try {
                const res = await api.updateProgress(problemTitle, newStatus, problemId);
                setUser((prev) => (prev ? { ...prev, solved_count: res.total_solved_count } : null));
            } catch (err) {
                console.error('Failed to sync progress with database:', err);
            }
        } else {
            // Save to guest localStorage
            localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(updatedProgress));
        }
    };

    const solvedCount = user
        ? Object.values(userProgress).filter((s) => s === 'solved').length || user.solved_count
        : Object.values(userProgress).filter((s) => s === 'solved').length;

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
