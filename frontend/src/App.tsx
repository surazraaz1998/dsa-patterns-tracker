import { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackProvider, useTrack } from './context/TrackContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DetailPanel } from './components/DetailPanel';
import { LandingShowcase } from './components/LandingShowcase';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import { PatternDetail, PatternSummary } from './types';
import { FaGithub, FaLinkedin, FaInstagram, FaList, FaBookOpen, FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const LINKEDIN_URL = 'https://www.linkedin.com/in/surazraaz1998/';
const INSTAGRAM_URL = 'https://www.instagram.com/__r.a.a.j/';
const GITHUB_URL = 'https://github.com/surazraaz1998';

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
    const { activeTrackId } = useTrack();
    const [patterns, setPatterns] = useState<PatternSummary[]>([]);
    const [selectedPattern, setSelectedPattern] = useState<PatternDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<'topics' | 'details'>('topics');

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

    const openAuthModal = (tab: 'login' | 'register') => {
        setAuthModalTab(tab);
        setIsAuthModalOpen(true);
    };

    // Auto-detect GitHub / Google OAuth ?code= redirect URL parameter on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const scope = urlParams.get('scope') || '';

        if (code) {
            window.history.replaceState({}, document.title, window.location.pathname);
            const redirectUri = window.location.origin;

            if (scope.includes('googleapis') || scope.includes('userinfo')) {
                void googleLogin({ code, redirectUri });
            } else {
                void githubLogin({ code, redirectUri }).catch(() => {
                    return googleLogin({ code, redirectUri });
                });
            }
        }
    }, [githubLogin, googleLogin]);

    // Load patterns ONLY when authenticated
    useEffect(() => {
        if (!isAuthenticated) {
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
                if (data && data.length > 0) {
                    await fetchPatternDetail(data[0].slug, false);
                } else {
                    setSelectedPattern(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unexpected error');
                setPatterns([]);
                setSelectedPattern(null);
            } finally {
                setLoading(false);
            }
        };

        void loadPatterns();
    }, [activeTrackId, isAuthenticated]);

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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Header Navbar with Mobile Drawer */}
            <Header
                patterns={patterns}
                selectedSlug={selectedPattern?.slug}
                onSelectPattern={(slug) => void fetchPatternDetail(slug, true)}
            />

            {/* If Authenticated: Render Workspace */}
            {isAuthenticated ? (
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
                                <DetailPanel selectedPattern={selectedPattern} />
                            </div>
                        </div>
                    </main>
                </>
            ) : (
                /* If Guest (Unauthenticated): Render Brand Landing Showcase */
                <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1">
                    <LandingShowcase onOpenAuth={openAuthModal} />
                </main>
            )}

            {/* Auth Modal Triggered from Landing Showcase */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialTab={authModalTab}
            />

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
                    <MainAppContent />
                </TrackProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
