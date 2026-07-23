import { AuthResponse, PatternDetail, PatternSummary, ProblemStatus, User, UserProgressMap } from '../types';

const API_BASE_URL =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL?.replace(/\/$/, '') ||
    (import.meta.env.PROD ? 'https://dsa-patterns-tracker-backend.onrender.com' : 'http://localhost:8000');

function getAuthHeaders(token?: string | null): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const activeToken = token || localStorage.getItem('dsa_tracker_token');
    if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
}

// In-Memory Response Caches for pure GET APIs
const patternListCache = new Map<string, PatternSummary[]>();
const patternDetailCache = new Map<string, PatternDetail>();

export const api = {
    clearCache(): void {
        patternListCache.clear();
        patternDetailCache.clear();
    },

    // Patterns API (Cached for instant UI rendering)
    async getPatterns(trackCategory: string = 'dsa'): Promise<PatternSummary[]> {
        if (patternListCache.has(trackCategory)) {
            return patternListCache.get(trackCategory)!;
        }
        const response = await fetch(`${API_BASE_URL}/patterns?track=${trackCategory}`);
        if (!response.ok) {
            throw new Error('Failed to fetch patterns');
        }
        const data: PatternSummary[] = await response.json();
        patternListCache.set(trackCategory, data);
        return data;
    },

    async getPatternDetail(slug: string): Promise<PatternDetail> {
        if (patternDetailCache.has(slug)) {
            return patternDetailCache.get(slug)!;
        }
        const response = await fetch(`${API_BASE_URL}/patterns/${slug}`);
        if (!response.ok) {
            throw new Error('Failed to fetch pattern details');
        }
        const data: PatternDetail = await response.json();
        patternDetailCache.set(slug, data);
        return data;
    },

    // Auth API
    async login(username_or_email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email, password }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Invalid login credentials');
        }
        return response.json();
    },

    async register(username: string, email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Registration failed');
        }
        return response.json();
    },

    async unifiedEmailAuth(email: string, password?: string, username?: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/email-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Authentication failed');
        }
        return response.json();
    },

    async getGitHubOAuthUrl(redirectUri?: string): Promise<{ url: string; client_id: string; configured?: boolean }> {
        const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
        const response = await fetch(`${API_BASE_URL}/auth/github/url${query}`);
        if (!response.ok) {
            throw new Error('Failed to get GitHub OAuth URL');
        }
        return response.json();
    },

    async githubAuth(params: { code?: string; redirectUri?: string; githubUsername?: string; email?: string; avatarUrl?: string } | string): Promise<AuthResponse> {
        const payload = typeof params === 'string'
            ? { github_username: params, avatar_url: `https://github.com/${params}.png` }
            : {
                code: params.code,
                redirect_uri: params.redirectUri,
                github_username: params.githubUsername,
                email: params.email,
                avatar_url: params.avatarUrl,
              };

        const response = await fetch(`${API_BASE_URL}/auth/github`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'GitHub authentication failed');
        }
        return response.json();
    },

    async getGoogleOAuthUrl(redirectUri?: string): Promise<{ url: string; client_id: string; configured?: boolean }> {
        const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
        const response = await fetch(`${API_BASE_URL}/auth/google/url${query}`);
        if (!response.ok) {
            throw new Error('Failed to get Google OAuth URL');
        }
        return response.json();
    },

    async googleAuth(params: { code?: string; redirectUri?: string; email?: string; name?: string; avatarUrl?: string }): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: params.code,
                redirect_uri: params.redirectUri,
                email: params.email,
                name: params.name,
                avatar_url: params.avatarUrl,
            }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Google authentication failed');
        }
        return response.json();
    },

    async getCurrentUser(token?: string): Promise<User> {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        return response.json();
    },

    async updateProfile(data: { leetcode_username?: string; gfg_username?: string; avatar_url?: string }): Promise<User> {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Failed to update profile');
        }
        return response.json();
    },

    // Progress & Sync API
    async getProgress(): Promise<UserProgressMap> {
        const response = await fetch(`${API_BASE_URL}/progress`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            return {};
        }
        const data = await response.json();
        return data.progress || {};
    },

    async updateProgress(
        problemTitle: string,
        status: ProblemStatus,
        problemId?: number,
        submittedCode?: string,
        submittedLanguage?: string
    ): Promise<{ total_solved_count: number; submitted_code?: string; submitted_language?: string }> {
        const response = await fetch(`${API_BASE_URL}/progress`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                problem_id: problemId,
                problem_title: problemTitle,
                status,
                submitted_code: submittedCode,
                submitted_language: submittedLanguage,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to update progress');
        }
        return response.json();
    },

    async syncLeetCode(leetcodeUsername?: string): Promise<{ status: string; synced_count: number; synced_problems: string[]; total_solved_count: number }> {
        const response = await fetch(`${API_BASE_URL}/progress/sync-leetcode`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ leetcode_username: leetcodeUsername }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'LeetCode sync failed');
        }
        return response.json();
    },

    async autoSync(payload: {
        problem_title?: string;
        leetcode_slug?: string;
        problem_id?: number;
        status?: string;
        submitted_code?: string;
        submitted_language?: string;
    }): Promise<{ status: string; synced_problem: string; total_solved_count: number }> {
        const response = await fetch(`${API_BASE_URL}/progress/auto-sync`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Auto-sync failed');
        }
        return response.json();
    },
};
