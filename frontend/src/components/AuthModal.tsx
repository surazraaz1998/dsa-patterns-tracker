import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FaGithub, FaTimes, FaUser, FaLock, FaCode, FaArrowRight, FaCheck } from 'react-icons/fa';

type AuthModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'login' | 'register';
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { user, login, githubLogin, updateProfile } = useAuth();
    const [step, setStep] = useState<'auth' | 'link_profiles'>('auth');

    // Unified Credentials State
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    // Profile Handles State
    const [leetcodeHandle, setLeetcodeHandle] = useState('');
    const [gfgHandle, setGfgHandle] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // CRITICAL: Reset step to 'auth' whenever modal opens so re-login after logout ALWAYS works!
    useEffect(() => {
        if (isOpen) {
            setStep('auth');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Sync saved handles when user changes or step transitions to profile linking
    useEffect(() => {
        if (user) {
            setLeetcodeHandle(user.leetcode_username || '');
            setGfgHandle(user.gfg_username || '');
        }
    }, [user, step]);

    if (!isOpen) return null;

    const handleGitHubAuth = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const oauthInfo = await api.getGitHubOAuthUrl().catch(() => null);
            if (oauthInfo && oauthInfo.client_id) {
                window.location.href = oauthInfo.url;
                return;
            }
            // Seamless 1-Click fallback authentication
            const defaultHandle = user?.github_username;
            if (!defaultHandle) {
                setError('Please enter your GitHub username');
                return;
            }
            await githubLogin({ githubUsername: defaultHandle });
            setStep('link_profiles');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'GitHub authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnifiedSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim() || !password) {
            setError('Please enter your email/username and password');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await login(identifier.trim(), password);
            setStep('link_profiles');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveProfiles = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateProfile({
                leetcode_username: leetcodeHandle.trim() || undefined,
                gfg_username: gfgHandle.trim() || undefined,
            });
            onClose();
        } catch (err) {
            console.warn('Failed to save profile handles:', err);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                >
                    <FaTimes size={14} />
                </button>

                {step === 'auth' ? (
                    <>
                        <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20">
                                <FaCode size={22} />
                            </div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome to AlgoTrack</h2>
                            <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                1-Click login or account creation to track your DSA patterns & coding progress.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                                {error}
                            </div>
                        )}

                        {/* 1-Click Primary GitHub OAuth Login */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => void handleGitHubAuth()}
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-2xl bg-slate-950 border border-slate-700 hover:border-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-xl transition transform hover:-translate-y-0.5"
                            >
                                <FaGithub size={18} className="text-white" />
                                {isSubmitting ? 'Connecting GitHub...' : '1-Click Login with GitHub'}
                            </button>

                            <div className="relative text-center my-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                                <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 font-medium">or continue with credentials</span>
                            </div>
                        </div>

                        {/* Unified Single Login / Account Form */}
                        <form onSubmit={(e) => void handleUnifiedSubmit(e)} className="space-y-3.5 text-left">
                            <div className="relative flex items-center">
                                <FaUser className="absolute left-3.5 text-slate-500 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Username or Email"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="relative flex items-center">
                                <FaLock className="absolute left-3.5 text-slate-500 text-xs" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 hover:opacity-90 transition flex items-center justify-center gap-1.5"
                            >
                                <span>{isSubmitting ? 'Authenticating...' : 'Continue to Workspace'}</span>
                                <FaArrowRight size={12} />
                            </button>
                        </form>
                    </>
                ) : (
                    /* Step 2: Link Coding Profiles */
                    <form onSubmit={(e) => void handleSaveProfiles(e)} className="space-y-5 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                            <FaCheck size={20} />
                        </div>

                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">Connect Coding Profiles</h2>
                            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                                Link your LeetCode and GeeksForGeeks usernames so AlgoTrack can auto-sync your solved problems.
                            </p>
                        </div>

                        <div className="space-y-3.5 text-left bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                                    🟠 LeetCode Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. john_leetcode"
                                    value={leetcodeHandle}
                                    onChange={(e) => setLeetcodeHandle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                    🟢 GeeksForGeeks Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. john_gfg"
                                    value={gfgHandle}
                                    onChange={(e) => setGfgHandle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-400 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:opacity-90 transition"
                            >
                                Save & Enter Workspace <FaArrowRight size={12} />
                            </button>

                            <button
                                type="button"
                                onClick={handleSkip}
                                className="text-xs text-slate-400 hover:text-slate-200 transition py-1"
                            >
                                Skip for now →
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
