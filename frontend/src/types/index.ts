export type TrackId = string;

export type TrackInfo = {
    id: TrackId;
    name: string;
    description: string;
    icon: string;
    badge?: string | null;
    topic_count?: number;
    question_count?: number;
};

export type ProblemGuide = {
    hints: string[];
    explanation: string;
    answer_md?: string;
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
    lesson_status?: 'full' | 'outline' | null;
    lesson_week?: string | null;
};

export type QuizQuestion = { q: string; options: string[]; answer: number; why: string };
export type Resource = { label: string; url?: string };
export type DryRun = { title: string; input: string; columns: string[]; steps: string[][]; takeaway: string };

// A YouTube clip for one lesson section; start/end (seconds) play only the relevant part.
export type VideoClip = { id: string; title: string; channel: string; start?: number; end?: number; label?: string };

// An interactive visualisation rendered by a registered visualiser (see src/visuals).
export type Visual = {
    type: 'sorting' | 'binary-search' | 'two-pointers' | 'sliding-window' | 'linked-list' | 'tree' | 'graph' | 'dp';
    algorithm: string;
    options?: string[]; // other algorithms of the same type the viewer can switch to
};

export type Concept = { title: string; body: string; videos?: VideoClip[]; visual?: Visual };

export type Lesson = {
    status: 'full' | 'outline';
    week?: string;
    simple: string;
    analogy?: string;
    concepts?: Concept[];
    when_to_use?: string[];
    dry_run?: DryRun;
    template?: { python?: string; javascript?: string };
    complexity?: string;
    mistakes?: string[];
    interview_tips?: string[];
    quiz?: QuizQuestion[];
    key_points?: string[];
    resources?: Resource[];
};

export type RoadmapItem = { id: string; track: string; label: string; lessons: string[]; resource?: Resource };
export type RoadmapBlock = { weeks: string; phase: number; items: RoadmapItem[] };
export type RoadmapPhase = { id: number; name: string; weeks: string; goal: string; checkpoint: string };
export type Roadmap = {
    title: string;
    subtitle: string;
    phases: RoadmapPhase[];
    blocks: RoadmapBlock[];
    playbook: Record<'dsa' | 'hld' | 'lld', string[]>;
};

export type PatternDetail = {
    slug: string;
    name: string;
    description: string;
    track_category?: string;
    revision_note_md: string;
    lesson?: Lesson | null;
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
    auth_provider: 'email' | 'github' | 'google';
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
