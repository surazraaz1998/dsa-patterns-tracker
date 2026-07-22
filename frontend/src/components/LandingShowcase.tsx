import React from 'react';
import {
    FaRocket,
    FaBrain,
    FaLaptopCode,
    FaLayerGroup,
    FaCheckCircle,
    FaArrowRight,
    FaLock,
    FaStar,
    FaShieldAlt,
    FaCode,
    FaLightbulb
} from 'react-icons/fa';

type LandingShowcaseProps = {
    onOpenAuth: (tab: 'login' | 'register') => void;
};

export const LandingShowcase: React.FC<LandingShowcaseProps> = ({ onOpenAuth }) => {
    return (
        <div className="w-full max-w-6xl mx-auto py-6 md:py-12 space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                    <FaRocket className="text-blue-400" /> Structured Interview Prep Platform
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    Master <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">DSA Patterns & Machine Coding</span> Like a Pro
                </h1>

                <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal">
                    Stop grinding 500+ random LeetCode questions. AlgoTrack organizes technical preparation into core reusable patterns, curated machine coding challenges, and SDE 1 interview architectures.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <button
                        type="button"
                        onClick={() => onOpenAuth('register')}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/25 hover:opacity-95 hover:scale-[1.02] transition-all"
                    >
                        <span>Get Started Free</span>
                        <FaArrowRight size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenAuth('login')}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-slate-200 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all"
                    >
                        <FaLock size={12} className="text-slate-400" />
                        <span>Sign In to Unlock</span>
                    </button>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2">
                    <span className="flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> 100% Free Forever</span>
                    <span className="flex items-center gap-1.5"><FaStar className="text-amber-400" /> Curated Questions</span>
                    <span className="flex items-center gap-1.5"><FaCheckCircle className="text-blue-400" /> Real-time Progress</span>
                </div>
            </div>

            {/* Solution Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Feature 1 */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 hover:border-blue-500/40 transition">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl">
                        <FaBrain />
                    </div>
                    <h3 className="text-base font-bold text-white">Pattern-Based Learning</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Group questions by underlying algorithmic patterns (Two-Pointer, Sliding Window, Monotonic Stack) to solve new problems effortlessly.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 hover:border-indigo-500/40 transition">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl">
                        <FaLaptopCode />
                    </div>
                    <h3 className="text-base font-bold text-white">Frontend Machine Coding</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Master real UI machine coding rounds: Debounce, Throttle, Custom Promise polyfills, Virtualized lists, and custom React hooks.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 hover:border-purple-500/40 transition">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl">
                        <FaLayerGroup />
                    </div>
                    <h3 className="text-base font-bold text-white">SDE 1 & System Design</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Step-by-step guides for LRU Cache, URL Shortener, Low-Level Design (LLD), and fundamental backend architecture concepts.
                    </p>
                </div>
            </div>

            {/* Interactive Preview Teaser Box */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 md:p-8 overflow-hidden shadow-2xl">
                {/* Blur Glow Background Accent */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Sneak Peek Inside</span>
                            <h2 className="text-lg md:text-xl font-bold text-white">Structured Practice Workspace</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => onOpenAuth('register')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold self-start sm:self-auto transition"
                        >
                            <FaLock size={12} /> Unlock All Practice Guides
                        </button>
                    </div>

                    {/* Dummy Blurred Teaser Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sample Card 1 */}
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                    <FaCode className="text-blue-400" /> Two Pointers — Container With Most Water
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                    Tier 1 Easy
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Use left & right pointers at container boundaries to maximize width and compute area.
                            </p>
                            <div className="flex gap-2 pt-1">
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaLightbulb className="text-amber-400" /> 2 Hints Included
                                </span>
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaCode className="text-blue-400" /> JS & Python Solutions
                                </span>
                            </div>
                        </div>

                        {/* Sample Card 2 */}
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                    <FaLaptopCode className="text-indigo-400" /> Debounce & Throttle Polyfill
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                                    Tier 2 Medium
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Implement production-grade rate limiters handling trailing calls & leading execution.
                            </p>
                            <div className="flex gap-2 pt-1">
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaLightbulb className="text-amber-400" /> Closure & Timer Hints
                                </span>
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaCode className="text-blue-400" /> Production Code
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Lock Overlay Banner */}
                    <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-center space-y-2">
                        <p className="text-xs text-blue-200">
                            🔒 <strong>Authentication Required:</strong> Please log in or create a free account to access questions, practice solutions, and save your progress.
                        </p>
                        <div className="flex justify-center gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => onOpenAuth('login')}
                                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                            >
                                Log In
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenAuth('register')}
                                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                            >
                                Register Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
