import { AuthResponse, PatternDetail, PatternSummary, ProblemStatus, User } from '../types';

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

export const api = {
    // Patterns API
    async getPatterns(trackCategory: string = 'dsa'): Promise<PatternSummary[]> {
        const response = await fetch(`${API_BASE_URL}/patterns?track=${trackCategory}`);
        if (!response.ok) {
            throw new Error('Failed to fetch patterns');
        }
        return response.json();
    },

    async getPatternDetail(slug: string): Promise<PatternDetail> {
        const response = await fetch(`${API_BASE_URL}/patterns/${slug}`);
        if (!response.ok) {
            throw new Error('Failed to fetch pattern details');
        }
        return response.json();
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

    async githubAuth(githubUsername: string, email?: string, avatarUrl?: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/github`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                github_username: githubUsername,
                email,
                avatar_url: avatarUrl,
            }),
        });
        if (!response.ok) {
            throw new Error('GitHub authentication failed');
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

    // Progress API
    async getProgress(): Promise<Record<string, ProblemStatus>> {
        const response = await fetch(`${API_BASE_URL}/progress`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            return {};
        }
        const data = await response.json();
        return data.progress || {};
    },

    async updateProgress(problemTitle: string, status: ProblemStatus, problemId?: number): Promise<{ total_solved_count: number }> {
        const response = await fetch(`${API_BASE_URL}/progress`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                problem_id: problemId,
                problem_title: problemTitle,
                status,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to update progress');
        }
        return response.json();
    },
};
