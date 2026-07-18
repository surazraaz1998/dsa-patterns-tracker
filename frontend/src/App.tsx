import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
                <div>
                    <p className="eyebrow">DSA Patterns Tracker</p>
                    <h1>Study core patterns with a guided roadmap.</h1>
                    <p className="hero-copy">
                        Track the Two Pointer pattern, browse tiered problems, and connect each challenge to
                        LeetCode.
                    </p>
                </div>
            </header>

            <main className="content-grid">
                <aside className="sidebar">
                    <h2>Patterns</h2>
                    {loading && <p>Loading patterns…</p>}
                    {error && <p className="error">{error}</p>}
                    {!loading && !error && (
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
                    )}
                </aside>

                <section className="detail-panel">
                    {selectedPattern ? (
                        <>
                            <h2>{selectedPattern.name}</h2>
                            <p>{selectedPattern.description}</p>
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
                        <p>Select a pattern to begin.</p>
                    )}
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 Built By Suraj for focused DSA practice.</p>
                <div className="social-links">
                    <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                        LinkedIn
                    </a>
                    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                        Instagram
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default App;
