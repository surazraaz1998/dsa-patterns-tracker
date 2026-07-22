import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrack, TRACKS } from '../context/TrackContext';
import { TrackSelector } from './TrackSelector';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { TrackId, PatternSummary } from '../types';
import {
    FaCode,
    FaTrophy,
    FaUser,
    FaUserPlus,
    FaBars,
    FaTimes,
    FaCheckCircle,
    FaSignOutAlt,
    FaGithub,
    FaLinkedin,
    FaInstagram
} from 'react-icons/fa';

type HeaderProps = {
    patterns?: PatternSummary[];
    selectedSlug?: string;
    onSelectPattern?: (slug: string) => void;
};

export const Header: React.FC<HeaderProps> = ({
    patterns = [],
    selectedSlug,
    onSelectPattern,
}) => {
    const { user, isAuthenticated, solvedCount, logout } = useAuth();
    const { activeTrack, selectTrack } = useTrack();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const openAuthModal = (tab: 'login' | 'register') => {
        setAuthModalTab(tab);
        setIsAuthModalOpen(true);
        setIsMobileMenuOpen(false);
    };

    const handleTrackSelect = (id: TrackId) => {
        selectTrack(id);
    };

    const handleTopicClick = (slug: string) => {
        if (onSelectPattern) {
            onSelectPattern(slug);
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-xl border-b border-slate-800 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    {/* Left: Brand Logo */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <FaCode size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-extrabold bg-gradient-to-r from-white via-slate-100 to-blue-300 bg-clip-text text-transparent tracking-tight">
                                AlgoTrack
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 -mt-1 hidden sm:inline">
                                Patterns & Interview Prep
                            </span>
                        </div>
                    </div>

                    {/* Middle: Desktop Track Switcher */}
                    <div className="hidden md:flex flex-1 justify-center max-w-xl px-2">
                        <TrackSelector />
                    </div>

                    {/* Right: Solved Badge & Auth (Desktop) */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <FaTrophy className="text-emerald-400 text-sm" />
                            <div className="flex items-baseline gap-1">
                                <span className="font-extrabold text-white text-sm">{solvedCount}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Solved</span>
                            </div>
                        </div>

                        {isAuthenticated && user ? (
                            <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(true)}
                                className="flex items-center gap-2.5 p-1 pr-3.5 rounded-full bg-slate-800/80 border border-slate-700 hover:border-blue-500 text-slate-100 transition"
                            >
                                <img src={user.avatar_url} alt={user.username} className="w-7 h-7 rounded-full object-cover bg-slate-900" />
                                <span className="text-xs font-semibold">{user.username}</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => openAuthModal('login')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:border-blue-400 transition"
                                >
                                    <FaUser size={12} /> Log In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openAuthModal('register')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30 hover:opacity-90 transition"
                                >
                                    <FaUserPlus size={12} /> Register
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Controls (Right): Solved Badge + Hamburger Toggle */}
                    <div className="flex md:hidden items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                            <FaTrophy size={12} />
                            <span className="font-extrabold text-white text-xs">{solvedCount}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white"
                            aria-label="Toggle Navigation Drawer"
                        >
                            {isMobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Slide-over Mobile Navigation Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-4/5 max-w-sm h-full bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-10 animate-slide-left">
                        <div className="space-y-6">
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm">
                                        <FaCode />
                                    </div>
                                    <span className="font-extrabold text-base text-white">AlgoTrack Navigation</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            {/* Auth Status & Account Summary */}
                            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                                {isAuthenticated && user ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full object-cover bg-slate-900" />
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{user.username}</h4>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => logout()}
                                            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition"
                                            title="Log Out"
                                        >
                                            <FaSignOutAlt size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-400">Log in to sync solved problems across devices.</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openAuthModal('login')}
                                                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-center"
                                            >
                                                Log In
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openAuthModal('register')}
                                                className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 text-center shadow-md shadow-blue-500/20"
                                            >
                                                Register
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Learning Tracks Selection */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Learning Track</h4>
                                <div className="space-y-1.5">
                                    {TRACKS.map((t) => {
                                        const isActive = activeTrack.id === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => handleTrackSelect(t.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                                                    isActive
                                                        ? 'bg-blue-600/20 border border-blue-500/50 text-white font-bold'
                                                        : 'bg-slate-800/40 border border-slate-800 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-base">{t.icon}</span>
                                                    <span className="text-xs">{t.name}</span>
                                                </div>
                                                {isActive && <FaCheckCircle className="text-blue-400 text-xs" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Mobile Topics List */}
                            {patterns.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Topics in {activeTrack.name}</h4>
                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                        {patterns.map((p) => {
                                            const isSelected = selectedSlug === p.slug;
                                            return (
                                                <button
                                                    key={p.slug}
                                                    type="button"
                                                    onClick={() => handleTopicClick(p.slug)}
                                                    className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between ${
                                                        isSelected
                                                            ? 'bg-slate-800 border border-blue-500/40 text-blue-300 font-semibold'
                                                            : 'text-slate-300 hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{p.name}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">
                                                        {p.problem_count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Socials */}
                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
                            <span>Built by Suraj Raj</span>
                            <div className="flex gap-3 text-slate-400">
                                <a href="https://github.com/surazraaz1998" target="_blank" rel="noreferrer"><FaGithub size={14} /></a>
                                <a href="https://www.linkedin.com/in/surazraaz1998/" target="_blank" rel="noreferrer"><FaLinkedin size={14} /></a>
                                <a href="https://www.instagram.com/__r.a.a.j/" target="_blank" rel="noreferrer"><FaInstagram size={14} /></a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth & Profile Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialTab={authModalTab}
            />

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </>
    );
};
