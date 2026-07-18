import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";

type ProblemGuide = {
    hints: string[];
    explanation: string;
    python: string;
    javascript: string;
};

type Problem = {
    title: string;
    leetcode_url: string;
    leetcode_number: number | null;
    guide?: ProblemGuide;
};

type PatternSummary = {
    slug: string;
    name: string;
    description: string;
    problem_count: number;
};

type PatternDetail = {
    slug: string;
    name: string;
    description: string;
    revision_note_md: string;
    problems_by_tier: Record<string, Problem[]>;
};

const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL?.replace(/\/$/, '') || (import.meta.env.PROD ? 'https://dsa-patterns-tracker-backend.onrender.com' : 'http://localhost:8000');
const LINKEDIN_URL = 'https://www.linkedin.com/in/surazraaz1998/';
const INSTAGRAM_URL = 'https://www.instagram.com/__r.a.a.j/';
const GITHUB_URL = 'https://github.com/surazraaz1998';

function App() {
    const [patterns, setPatterns] = useState<PatternSummary[]>([]);
    const [selectedPattern, setSelectedPattern] = useState<PatternDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedPanels, setExpandedPanels] = useState<Record<string, 'hints' | 'answer' | null>>({});

    useEffect(() => {
        const loadPatterns = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/patterns`);
                if (!response.ok) {
                    throw new Error('Unable to load patterns');
                }
                const data = (await response.json()) as PatternSummary[];
                setPatterns(data);
                if (data[0]) {
                    setSelectedPattern(null);
                    await loadPattern(data[0].slug);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unexpected error');
            } finally {
                setLoading(false);
            }
        };

        void loadPatterns();
    }, []);

    const loadPattern = async (slug: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/patterns/${slug}`);
            if (!response.ok) {
                throw new Error('Unable to load pattern details');
            }
            const data = (await response.json()) as PatternDetail;
            setSelectedPattern(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unexpected error');
        }
    };

    const togglePanel = (problemKey: string, panel: 'hints' | 'answer') => {
        setExpandedPanels((current) => ({
            ...current,
            [problemKey]: current[problemKey] === panel ? null : panel,
        }));
    };

    return (
        <div className="app-shell">
            <header className="hero">
                <div className="hero-content">
                    <div className="hero-text">
                        <p className="eyebrow">DSA Patterns Tracker</p>
                        <p className="hero-copy">
                            Follow a structured path through core interview patterns, review revision notes,
                            and open each problem with hints, explanations, and solution snippets.
                        </p>
                    </div>
                </div>
            </header>

            <main className="content-grid">
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h2>Patterns</h2>
                        <span className="sidebar-caption">Pick a topic</span>
                    </div>
                    {loading && <p>Loading patterns…</p>}
                    {error && <p className="error">{error}</p>}
                    {!loading && !error && (
                        <div className="scrollable-list">
                            <ul className="pattern-list">
                                {patterns.map((pattern) => (
                                    <li key={pattern.slug}>
                                        <button
                                            className={selectedPattern?.slug === pattern.slug ? 'pattern-card active' : 'pattern-card'}
                                            onClick={() => {
                                                void loadPattern(pattern.slug);
                                            }}
                                        >
                                            <strong>{pattern.name}</strong>
                                            <span>{pattern.problem_count} problems</span>
                                            <small>{pattern.description}</small>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>

                <section className="detail-panel">
                    <div className="detail-scroll-area">
                        {selectedPattern ? (
                            <>
                                <div className="detail-header">
                                    <h2>{selectedPattern.name}</h2>
                                    <p>{selectedPattern.description}</p>
                                </div>
                                <div className="markdown-card">
                                    <h3>Revision Notes</h3>
                                    <ReactMarkdown>{selectedPattern.revision_note_md}</ReactMarkdown>
                                </div>
                                <div className="tiers">
                                    {Object.entries(selectedPattern.problems_by_tier).map(([tier, problems]) => (
                                        <div key={tier} className="tier-card">
                                            <h3>Tier {tier}</h3>
                                            <ul className="problem-list">
                                                {problems.map((problem) => {
                                                    const problemKey = `${problem.title}-${problem.leetcode_number ?? 'na'}`;
                                                    const guide = problem.guide ?? {
                                                        hints: ['Read the problem statement carefully and identify the core pattern.'],
                                                        explanation: 'Use a structured approach to break the problem into smaller steps before coding the solution.',
                                                        python: '# Add a Python solution here',
                                                        javascript: '// Add a JavaScript solution here',
                                                    };
                                                    const isHintsOpen = expandedPanels[problemKey] === 'hints';
                                                    const isAnswerOpen = expandedPanels[problemKey] === 'answer';

                                                    return (
                                                        <li key={problemKey} className="problem-item">
                                                            <div className="problem-header-row">
                                                                <a href={problem.leetcode_url} target="_blank" rel="noreferrer">
                                                                    {problem.title}
                                                                </a>
                                                                <div className="problem-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="secondary-btn"
                                                                        onClick={() => togglePanel(problemKey, 'hints')}
                                                                    >
                                                                        {isHintsOpen ? 'Hide Hints' : 'Show Hints'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="secondary-btn"
                                                                        onClick={() => togglePanel(problemKey, 'answer')}
                                                                    >
                                                                        {isAnswerOpen ? 'Hide Answer' : 'Show Answer'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {isHintsOpen && (
                                                                <div className="problem-panel">
                                                                    <h4>Hints</h4>
                                                                    <ul>
                                                                        {guide.hints.map((hint) => (
                                                                            <li key={hint}>{hint}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {isAnswerOpen && (
                                                                <div className="problem-panel">
                                                                    <h4>How to solve it</h4>
                                                                    <ReactMarkdown>{guide.explanation}</ReactMarkdown>
                                                                    <h5>Python</h5>
                                                                    <ReactMarkdown>{`\`\`\`python\n${guide.python}\n\`\`\``}</ReactMarkdown>
                                                                    <h5>JavaScript</h5>
                                                                    <ReactMarkdown>{`\`\`\`javascript\n${guide.javascript}\n\`\`\``}</ReactMarkdown>
                                                                </div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="empty-state">Select a pattern to begin.</p>
                        )}
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>Built with 💻 & ☕ by Suraj Raj</p>
                <div className="social-links">
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                        <FaGithub size={20} />
                    </a>
                    <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                        <FaLinkedin size={20} />
                    </a>
                    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <FaInstagram size={20} />
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default App;
