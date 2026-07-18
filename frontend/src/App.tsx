import { useEffect, useState } from 'react';

type Problem = {
    title: string;
    leetcode_url: string;
    leetcode_number: number | null;
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

const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
    const [patterns, setPatterns] = useState<PatternSummary[]>([]);
    const [selectedPattern, setSelectedPattern] = useState<PatternDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                                <pre>{selectedPattern.revision_note_md}</pre>
                            </div>
                            <div className="tiers">
                                {Object.entries(selectedPattern.problems_by_tier).map(([tier, problems]) => (
                                    <div key={tier} className="tier-card">
                                        <h3>Tier {tier}</h3>
                                        <ul>
                                            {problems.map((problem) => (
                                                <li key={`${problem.title}-${problem.leetcode_number}`}>
                                                    <a href={problem.leetcode_url} target="_blank" rel="noreferrer">
                                                        {problem.title}
                                                    </a>
                                                    {problem.leetcode_number ? ` · #${problem.leetcode_number}` : ''}
                                                </li>
                                            ))}
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
        </div>
    );
}

export default App;
