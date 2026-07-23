import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FaGithub, FaGoogle, FaTimes, FaEnvelope, FaLock, FaCode, FaArrowRight, FaCheck } from 'react-icons/fa';

type AuthModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'login' | 'register';
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { user, unifiedEmailAuth, updateProfile, syncLeetCode } = useAuth();
    const [step, setStep] = useState<'auth' | 'link_profiles'>('auth');

    // Email & Password state
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');

    // Handle Input states
    const [leetcodeHandle, setLeetcodeHandle] = useState('');
    const [gfgHandle, setGfgHandle] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset step to 'auth' whenever modal opens
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

    // Google OAuth Browser Redirect Flow
    const handleGoogleOAuth = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const redirectUri = window.location.origin;
            const res = await api.getGoogleOAuthUrl(redirectUri).catch(() => null);
            if (res && res.configured && res.client_id && res.url) {
                window.location.href = res.url;
                return;
            }
            setError('Google OAuth client ID is not configured in backend .env. Set GOOGLE_CLIENT_ID or continue with Email below.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // GitHub OAuth Browser Redirect Flow
    const handleGitHubOAuth = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const redirectUri = window.location.origin;
            const res = await api.getGitHubOAuthUrl(redirectUri).catch(() => null);
            if (res && res.configured && res.client_id && res.url) {
                window.location.href = res.url;
                return;
            }
            setError('GitHub OAuth client ID is not configured in backend .env. Please set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET in backend/.env');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'GitHub authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Unified Email Auto-Register / Login Submit
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput.trim() || !emailInput.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            const updatedUser = await unifiedEmailAuth(emailInput.trim(), passwordInput || undefined);
            if (!updatedUser.leetcode_username) {
                setStep('link_profiles');
            } else {
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Save Coding Profile Handles & Trigger Auto Sync
    const handleSaveProfiles = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateProfile({
                leetcode_username: leetcodeHandle.trim() || undefined,
                gfg_username: gfgHandle.trim() || undefined,
            });
            if (leetcodeHandle.trim()) {
                await syncLeetCode(leetcodeHandle.trim()).catch((syncErr) =>
                    console.warn('Sync failed:', syncErr)
                );
            }
            onClose();
        } catch (err) {
            console.warn('Failed to save profile handles:', err);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
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
                                1-Click OAuth or Email login to track DSA patterns & auto-sync solved questions.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                                {error}
                            </div>
                        )}

                        {/* Social OAuth Buttons (Google & GitHub) */}
                        <div className="space-y-2.5">
                            <button
                                type="button"
                                onClick={() => void handleGoogleOAuth()}
                                disabled={isSubmitting}
                                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-2.5 border border-slate-300 shadow-sm transition"
                            >
                                <FaGoogle size={15} className="text-rose-500" />
                                {isSubmitting ? 'Redirecting to Google...' : 'Continue with Google'}
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleGitHubOAuth()}
                                disabled={isSubmitting}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold flex items-center justify-center gap-2.5 border border-slate-700 shadow-sm transition"
                            >
                                <FaGithub size={16} />
                                {isSubmitting ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
                            </button>
                        </div>

                        <div className="relative text-center my-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                            <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 font-medium">or continue with email</span>
                        </div>

                        {/* Unified Email Login / Auto-Register Form */}
                        <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-3 text-left">
                            <div className="relative flex items-center">
                                <FaEnvelope className="absolute left-3.5 text-slate-500 text-xs" />
                                <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="relative flex items-center">
                                <FaLock className="absolute left-3.5 text-slate-500 text-xs" />
                                <input
                                    type="password"
                                    placeholder="Password (optional for new accounts)"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 hover:opacity-90 transition flex items-center justify-center gap-1.5"
                            >
                                <span>{isSubmitting ? 'Authenticating...' : 'Login / Auto-Register with Email'}</span>
                                <FaArrowRight size={12} />
                            </button>
                        </form>
                    </>
                ) : (
                    /* Step 2: Link Handles for Question Auto-Syncing */
                    <form onSubmit={(e) => void handleSaveProfiles(e)} className="space-y-5 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                            <FaCheck size={20} />
                        </div>

                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">Sync Solved Questions</h2>
                            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                                Enter your LeetCode username to automatically import and sync all your already solved questions!
                            </p>
                        </div>

                        <div className="space-y-3.5 text-left bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                                    🟠 LeetCode Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. your_leetcode_handle"
                                    value={leetcodeHandle}
                                    onChange={(e) => setLeetcodeHandle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                    🟢 GeeksForGeeks Username (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. your_gfg_handle"
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
                                {isSubmitting ? 'Saving & Syncing...' : 'Save & Sync Solved Questions'} <FaArrowRight size={12} />
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
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
