import { useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackProvider, useTrack } from './context/TrackContext';
import { LearningProvider } from './context/LearningContext';
import { RoadmapView } from './components/RoadmapView';
import { PlaybookView } from './components/PlaybookView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DetailPanel } from './components/DetailPanel';
import { LandingShowcase } from './components/LandingShowcase';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import { consumeOAuthCallback } from './services/oauth';
import { EdithPanel } from './voice/EdithPanel';
import { PatternDetail, PatternSummary } from './types';
import { FaGithub, FaLinkedin, FaInstagram, FaList, FaBookOpen, FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const LINKEDIN_URL = 'https://www.linkedin.com/in/surazraaz1998/';
const INSTAGRAM_URL = 'https://www.instagram.com/__r.a.a.j/';
const GITHUB_URL = 'https://github.com/surazraaz1998';
// EDITH (voice tutor) is paused; build with VITE_EDITH_ENABLED=true (and EDITH_ENABLED=true on the backend) to bring it back.
const EDITH_ENABLED = import.meta.env.VITE_EDITH_ENABLED === 'true';

type View = 'roadmap' | 'topics' | 'playbook';
const VIEWS: { id: View; label: string; short: string }[] = [
    { id: 'roadmap', label: '🗺️ Roadmap', short: '🗺️ Roadmap' },
    { id: 'topics', label: '📚 Lessons & practice', short: '📚 Lessons' },
    { id: 'playbook', label: '🎯 Interview playbook', short: '🎯 Playbook' },
];

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Unhandled React Error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                            <FaExclamationTriangle size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Something went wrong</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {this.state.error?.message || 'An unexpected rendering error occurred.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <FaRedo size={12} /> Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function MainAppContent() {
    const { isAuthenticated, githubLogin, googleLogin } = useAuth();
    const { activeTrackId, selectTrack } = useTrack();
    const [view, setView] = useState<View>('roadmap');
    // Lesson to open after switching tracks (set from the roadmap)
    const pendingSlug = useRef<string | null>(null);
    const [patterns, setPatterns] = useState<PatternSummary[]>([]);
    const [selectedPattern, setSelectedPattern] = useState<PatternDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<'topics' | 'details'>('topics');

    const [isGuestSession, setIsGuestSession] = useState<boolean>(() => {
        return localStorage.getItem('dsa_tracker_guest_mode') === 'true';
    });

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
    const [authError, setAuthError] = useState<string | null>(null);
    const [oauthInProgress, setOauthInProgress] = useState(false);
    const [isEdithOpen, setIsEdithOpen] = useState(false);

    const isWorkspaceActive = isAuthenticated || isGuestSession;

    const openAuthModal = (tab: 'login' | 'register') => {
        setAuthModalTab(tab);
        setIsAuthModalOpen(true);
    };

    const handleEnterGuestMode = () => {
        localStorage.setItem('dsa_tracker_guest_mode', 'true');
        setIsGuestSession(true);
        setIsAuthModalOpen(false);
    };

    // Finish GitHub / Google sign-in when the provider redirects back with ?code=&state=
    useEffect(() => {
        const callback = consumeOAuthCallback();
        if (callback.kind === 'none') return;
        if (callback.kind === 'error') {
            setAuthError(callback.message);
            setIsAuthModalOpen(true);
            return;
        }
        setOauthInProgress(true);
        const login = callback.provider === 'github' ? githubLogin : googleLogin;
        login({ code: callback.code, redirectUri: callback.redirectUri })
            .catch((err) => {
                setAuthError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
                setIsAuthModalOpen(true);
            })
            .finally(() => setOauthInProgress(false));
        // Runs once on mount; the URL params are consumed immediately.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load patterns ONLY when workspace is active (Authenticated OR Guest Mode entered)
    useEffect(() => {
        if (!isWorkspaceActive) {
            setPatterns([]);
            setSelectedPattern(null);
            setLoading(false);
            return;
        }

        const loadPatterns = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getPatterns(activeTrackId);
                setPatterns(data || []);
                const wanted = pendingSlug.current && data.find((p) => p.slug === pendingSlug.current);
                pendingSlug.current = null;
                if (wanted) {
                    await fetchPatternDetail(wanted.slug, true);
                } else if (data && data.length > 0) {
                    await fetchPatternDetail(data[0].slug, false);
                } else {
                    setSelectedPattern(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unexpected error loading patterns');
                setPatterns([]);
                setSelectedPattern(null);
            } finally {
                setLoading(false);
            }
        };

        void loadPatterns();
    }, [activeTrackId, isWorkspaceActive]);

    const fetchPatternDetail = async (slug: string, switchMobileTab: boolean = true) => {
        try {
            const data = await api.getPatternDetail(slug);
            setSelectedPattern(data);
            if (switchMobileTab) {
                setMobileTab('details');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load pattern details');
        }
    };

    const openLesson = (slug: string, trackId: string) => {
        const show = () => {
            setView('topics');
            window.scrollTo({ top: 0 });
        };
        if (trackId === activeTrackId) {
            // Switch view only once the lesson has loaded, so the previously selected topic doesn't flash.
            void fetchPatternDetail(slug, true).then(show);
        } else {
            // Another track: drop the old lesson now; the track's list shows its loading state meanwhile.
            setSelectedPattern(null);
            pendingSlug.current = slug;
            selectTrack(trackId);
            show();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Header Navbar */}
            <Header
                patterns={patterns}
                selectedSlug={selectedPattern?.slug}
                onSelectPattern={(slug) => void fetchPatternDetail(slug, true)}
                isWorkspaceActive={isWorkspaceActive}
                showTrackSelector={view === 'topics'}
                onEnterGuestMode={handleEnterGuestMode}
            />

            {/* If Active Workspace (Authenticated or Guest Mode): Render Practice Workspace */}
            {isWorkspaceActive && (
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-4 flex gap-2 overflow-x-auto no-scrollbar" aria-label="Sections">
                    {VIEWS.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => setView(v.id)}
                            aria-current={view === v.id ? 'page' : undefined}
                            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition ${
                                view === v.id ? 'bg-white text-slate-900 border-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                            }`}
                        >
                            {/* short labels keep all three tabs on screen on phones */}
                            <span className="sm:hidden">{v.short}</span>
                            <span className="hidden sm:inline">{v.label}</span>
                        </button>
                    ))}
                </nav>
            )}

            {isWorkspaceActive && view === 'roadmap' ? (
                <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex-1 mt-4 mb-8">
                    <RoadmapView onOpenLesson={openLesson} />
                </main>
            ) : isWorkspaceActive && view === 'playbook' ? (
                <main className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex-1 mt-4 mb-8">
                    <PlaybookView />
                </main>
            ) : isWorkspaceActive ? (
                <>
                    {/* Mobile View Toggle Tabs (< md screens) */}
                    <div className="flex md:hidden max-w-7xl mx-auto px-4 w-full mt-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setMobileTab('topics')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition ${
                                mobileTab === 'topics'
                                    ? 'bg-blue-600/30 border-blue-500 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                        >
                            <FaList size={12} /> Topics List ({(patterns || []).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileTab('details')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition ${
                                mobileTab === 'details'
                                    ? 'bg-blue-600/30 border-blue-500 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                        >
                            <FaBookOpen size={12} /> {selectedPattern ? selectedPattern.name : 'Guide Details'}
                        </button>
                    </div>

                    {/* Main Workspace Layout */}
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 mt-4 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            {/* Topics Sidebar Column */}
                            <div className={`md:col-span-4 lg:col-span-4 ${mobileTab === 'topics' ? 'block' : 'hidden md:block'}`}>
                                <Sidebar
                                    patterns={patterns}
                                    selectedPattern={selectedPattern}
                                    loading={loading}
                                    error={error}
                                    onSelectPattern={(slug) => void fetchPatternDetail(slug, true)}
                                />
                            </div>

                            {/* Problem Detail Panel Column */}
                            <div className={`md:col-span-8 lg:col-span-8 ${mobileTab === 'details' ? 'block' : 'hidden md:block'}`}>
                                <DetailPanel selectedPattern={selectedPattern} loading={loading} onOpenEdith={EDITH_ENABLED ? () => setIsEdithOpen(true) : undefined} />
                            </div>
                        </div>
                    </main>
                </>
            ) : (
                /* Initial Brand Landing Showcase (Zero API Calls) */
                <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1">
                    <LandingShowcase
                        onOpenAuth={openAuthModal}
                        onEnterGuestMode={handleEnterGuestMode}
                    />
                </main>
            )}

            {oauthInProgress && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm text-sm text-slate-200">
                    <p className="animate-pulse">Signing you in…</p>
                </div>
            )}

            {/* Auth Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => { setIsAuthModalOpen(false); setAuthError(null); }}
                initialTab={authModalTab}
                onEnterGuestMode={handleEnterGuestMode}
                externalError={authError}
            />

            {EDITH_ENABLED && <EdithPanel isOpen={isEdithOpen} onClose={() => setIsEdithOpen(false)} topic={selectedPattern} />}

            {/* Site Footer */}
            <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
                    <p>Built with 💻 & ☕ by Suraj Raj</p>
                    <div className="flex items-center gap-4 text-slate-400">
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition" aria-label="GitHub">
                            <FaGithub size={16} />
                        </a>
                        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition" aria-label="LinkedIn">
                            <FaLinkedin size={16} />
                        </a>
                        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition" aria-label="Instagram">
                            <FaInstagram size={16} />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <TrackProvider>
                    <LearningProvider>
                        <MainAppContent />
                    </LearningProvider>
                </TrackProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
