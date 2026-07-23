export type TrackId = 'dsa' | 'frontend' | 'sde1';

export type TrackInfo = {
    id: TrackId;
    name: string;
    description: string;
    icon: string;
    badge?: string;
    isComingSoon?: boolean;
};

export type ProblemGuide = {
    hints: string[];
    explanation: string;
    python: string;
    javascript: string;
};

export type Problem = {
    id?: number;
    title: string;
    leetcode_url: string;
    leetcode_number: number | null;
    guide?: ProblemGuide;
};

export type PatternSummary = {
    slug: string;
    name: string;
    description: string;
    track_category?: string;
    problem_count: number;
};

export type PatternDetail = {
    slug: string;
    name: string;
    description: string;
    track_category?: string;
    revision_note_md: string;
    problems_by_tier: Record<string, Problem[]>;
};

export type User = {
    id: number;
    username: string;
    email: string;
    avatar_url: string;
    github_username?: string;
    leetcode_username?: string;
    gfg_username?: string;
    auth_provider: 'email' | 'github';
    solved_count: number;
};

export type AuthResponse = {
    token: string;
    user: User;
};

export type ProblemStatus = 'not_started' | 'attempted' | 'solved';

export type ProblemProgressDetail = {
    status: ProblemStatus;
    submitted_code?: string | null;
    submitted_language?: string | null;
    last_submitted_at?: string | null;
};

export type UserProgressMap = Record<string, ProblemStatus | ProblemProgressDetail>;
