import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackProvider, useTrack } from './context/TrackContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DetailPanel } from './components/DetailPanel';
import { LandingShowcase } from './components/LandingShowcase';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import { PatternDetail, PatternSummary } from './types';
import { FaGithub, FaLinkedin, FaInstagram, FaList, FaBookOpen } from 'react-icons/fa';

const LINKEDIN_URL = 'https://www.linkedin.com/in/surazraaz1998/';
const INSTAGRAM_URL = 'https://www.instagram.com/__r.a.a.j/';
const GITHUB_URL = 'https://github.com/surazraaz1998';

function MainAppContent() {
    const { isAuthenticated } = useAuth();
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

    useEffect(() => {
        if (!isAuthenticated) return;

        const loadPatterns = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getPatterns(activeTrackId);
                setPatterns(data);
                if (data.length > 0) {
                    await loadPattern(data[0].slug);
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

    const loadPattern = async (slug: string) => {
        try {
            const data = await api.getPatternDetail(slug);
            setSelectedPattern(data);
            setMobileTab('details');
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
                onSelectPattern={(slug) => void loadPattern(slug)}
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
                            <FaList size={12} /> Topics List ({patterns.length})
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
                                    onSelectPattern={(slug) => void loadPattern(slug)}
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
        <AuthProvider>
            <TrackProvider>
                <MainAppContent />
            </TrackProvider>
        </AuthProvider>
    );
}

export default App;
