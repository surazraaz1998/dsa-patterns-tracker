import React from 'react';
import {
    FaRocket,
    FaRoute,
    FaChartBar,
    FaYoutube,
    FaLaptopCode,
    FaCheckCircle,
    FaArrowRight,
    FaStar,
    FaShieldAlt,
    FaCode,
    FaLightbulb,
    FaQuestionCircle,
    FaBolt
} from 'react-icons/fa';

type LandingShowcaseProps = {
    onOpenAuth: (tab: 'login' | 'register') => void;
    onEnterGuestMode?: () => void;
};

export const LandingShowcase: React.FC<LandingShowcaseProps> = ({ onOpenAuth, onEnterGuestMode }) => {
    return (
        <div className="w-full max-w-6xl mx-auto py-6 md:py-12 space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                    <FaRocket className="text-blue-400" /> Structured Interview Prep Platform
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    Your <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">6-month roadmap</span> to interview-ready
                </h1>

                <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal">
                    DSA, High-Level Design, Low-Level Design and Agentic AI — week by week, with simple lessons, dry runs, templates, practice lists and quick quizzes. Free, and works without an account.
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

                    {onEnterGuestMode && (
                        <button
                            type="button"
                            onClick={onEnterGuestMode}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-slate-200 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 hover:text-white transition-all shadow-lg"
                        >
                            <FaBolt size={14} className="text-amber-400" />
                            <span>Explore as Guest (Instant Access)</span>
                        </button>
                    )}
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-2">
                    <span className="flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> Free · no sign-up needed</span>
                    <span className="flex items-center gap-1.5"><FaStar className="text-amber-400" /> 41 full lessons · 4 tracks</span>
                    <span className="flex items-center gap-1.5"><FaCheckCircle className="text-blue-400" /> 29 step-by-step visualisers</span>
                </div>
            </div>

            {/* Solution Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Feature 1 */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 hover:border-blue-500/40 transition">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl">
                        <FaRoute />
                    </div>
                    <h3 className="text-base font-bold text-white">A 6-month roadmap</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        DSA, High-Level Design, Low-Level Design and Agentic AI side by side, in two-week blocks. Tick things off as you go — progress is saved even without an account.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 hover:border-indigo-500/40 transition">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl">
                        <FaChartBar />
                    </div>
                    <h3 className="text-base font-bold text-white">Watch algorithms run</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Every sorting method, binary search, two pointers, sliding window, linked lists, trees, BFS/DFS and DP tables — play, pause, step through, or type your own input.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 hover:border-purple-500/40 transition">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl">
                        <FaYoutube />
                    </div>
                    <h3 className="text-base font-bold text-white">Video clips, only the part you need</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        277 hand-picked clips from Striver, NeetCode, ByteByteGo and more play inside each lesson — starting at the exact part that explains that concept.
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
                            <h2 className="text-lg md:text-xl font-bold text-white">What a lesson looks like</h2>
                        </div>
                        {onEnterGuestMode && (
                            <button
                                type="button"
                                onClick={onEnterGuestMode}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition self-start sm:self-auto"
                            >
                                <FaBolt size={12} /> Open the roadmap
                            </button>
                        )}
                    </div>

                    {/* Preview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sample Card 1 */}
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                    <FaCode className="text-blue-400" /> Sorting — every method
                                </span>
                                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/30">
                                    Weeks 1–2
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Eleven sorting methods, from bubble to radix and cyclic sort — each with a visualiser you can step through and a clip that plays only that method.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaChartBar className="text-amber-400" /> Step-by-step visualiser
                                </span>
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaYoutube className="text-red-500" /> In-app video
                                </span>
                            </div>
                        </div>

                        {/* Sample Card 2 */}
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                    <FaLaptopCode className="text-indigo-400" /> LLD: Movie Booking (BookMyShow)
                                </span>
                                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/30">
                                    Weeks 13–14
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Hold, pay, confirm — and four ways to stop two people booking the same seat, with the trade-offs interviewers ask about.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaLightbulb className="text-amber-400" /> Dry run + template
                                </span>
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                                    <FaQuestionCircle className="text-blue-400" /> Quiz + interview tips
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA Bar */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-left">
                            <h4 className="text-sm font-bold text-white">Ready to start practicing?</h4>
                            <p className="text-xs text-slate-400">Start as a guest — progress stays in this browser. Sign in any time to sync it across devices.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {onEnterGuestMode && (
                                <button
                                    type="button"
                                    onClick={onEnterGuestMode}
                                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                                >
                                    Try Guest Mode
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => onOpenAuth('register')}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-90 transition"
                            >
                                Sign Up Free
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
