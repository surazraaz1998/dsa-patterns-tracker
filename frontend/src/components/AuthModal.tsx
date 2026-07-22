import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaGithub, FaTimes, FaUser, FaLock, FaEnvelope, FaKey } from 'react-icons/fa';

type AuthModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'login' | 'register';
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
    const { login, loginAsAdmin, register, githubLogin } = useAuth();
    const [tab, setTab] = useState<'login' | 'register'>(initialTab);

    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await login(usernameOrEmail, password);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await register(regUsername, regEmail, regPassword);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminQuickLogin = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await loginAsAdmin();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Admin login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGitHubLogin = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await githubLogin('surazraaz1998');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'GitHub login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                >
                    <FaTimes size={14} />
                </button>

                <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome to AlgoTrack</h2>
                    <p className="text-xs text-slate-400 mt-1">Sign in to sync your progress and track solved problems.</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                        type="button"
                        onClick={() => { setTab('login'); setError(null); }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                            tab === 'login' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-400'
                        }`}
                    >
                        Log In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTab('register'); setError(null); }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                            tab === 'register' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-400'
                        }`}
                    >
                        Register
                    </button>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                        {error}
                    </div>
                )}

                {/* Precreated Admin Demo Card */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="text-xs text-amber-300">
                        <strong className="block text-amber-200">⚡ Precreated Test Credentials:</strong>
                        <span>Username: <code className="bg-slate-950 px-1 py-0.5 rounded text-white font-mono">Admin</code> | Password: <code className="bg-slate-950 px-1 py-0.5 rounded text-white font-mono">Suraz@1998</code></span>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleAdminQuickLogin()}
                        disabled={isSubmitting}
                        className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                    >
                        <FaKey size={12} /> Quick Login as Admin
                    </button>
                </div>

                {/* Social Login */}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => void handleGitHubLogin()}
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                        <FaGithub size={16} /> Continue with GitHub
                    </button>
                    <div className="relative text-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                        <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500">or continue with email</span>
                    </div>
                </div>

                {/* Form */}
                {tab === 'login' ? (
                    <form onSubmit={(e) => void handleLoginSubmit(e)} className="space-y-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Username or Email</label>
                            <div className="relative flex items-center">
                                <FaUser className="absolute left-3 text-slate-500 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Enter Admin or your email"
                                    value={usernameOrEmail}
                                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                            <div className="relative flex items-center">
                                <FaLock className="absolute left-3 text-slate-500 text-xs" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:opacity-90 transition"
                        >
                            {isSubmitting ? 'Logging in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={(e) => void handleRegisterSubmit(e)} className="space-y-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                            <div className="relative flex items-center">
                                <FaUser className="absolute left-3 text-slate-500 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Choose a username"
                                    value={regUsername}
                                    onChange={(e) => setRegUsername(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                            <div className="relative flex items-center">
                                <FaEnvelope className="absolute left-3 text-slate-500 text-xs" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                            <div className="relative flex items-center">
                                <FaLock className="absolute left-3 text-slate-500 text-xs" />
                                <input
                                    type="password"
                                    placeholder="Create password"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:opacity-90 transition"
                        >
                            {isSubmitting ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
