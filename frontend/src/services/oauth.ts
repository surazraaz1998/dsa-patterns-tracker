import { api } from './api';

export type OAuthProvider = 'github' | 'google';

const STATE_KEY = 'algotrack_oauth_state';
const PROVIDER_NAMES: Record<OAuthProvider, string> = { github: 'GitHub', google: 'Google' };

const redirectUri = () => window.location.origin;

/** Redirects to the provider's consent screen. Resolves only if the provider isn't configured. */
export async function startOAuth(provider: OAuthProvider): Promise<string> {
    // The state value both prevents CSRF and tells the callback which provider sent the user back.
    const random = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    const state = `${provider}.${random}`;
    sessionStorage.setItem(STATE_KEY, state);

    const res = provider === 'github'
        ? await api.getGitHubOAuthUrl(redirectUri(), state)
        : await api.getGoogleOAuthUrl(redirectUri(), state);
    if (!res.configured || !res.url) {
        sessionStorage.removeItem(STATE_KEY);
        return `${PROVIDER_NAMES[provider]} sign-in isn't configured on the server yet. Use email instead.`;
    }
    window.location.href = res.url;
    return '';
}

export type OAuthCallback =
    | { kind: 'none' }
    | { kind: 'error'; message: string }
    | { kind: 'code'; provider: OAuthProvider; code: string; redirectUri: string };

/** Reads (and strips) ?code=&state= from the URL after the provider redirects back. */
export function consumeOAuthCallback(): OAuthCallback {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const providerError = params.get('error');
    if (!code && !providerError) return { kind: 'none' };

    window.history.replaceState({}, document.title, window.location.pathname);
    const expected = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);

    if (providerError) {
        return { kind: 'error', message: providerError === 'access_denied' ? 'Sign-in was cancelled.' : `Sign-in failed: ${providerError}` };
    }
    if (!state || state !== expected) {
        return { kind: 'error', message: 'Sign-in session expired or was started in another tab. Please try again.' };
    }
    const provider = state.split('.')[0] as OAuthProvider;
    if (provider !== 'github' && provider !== 'google') {
        return { kind: 'error', message: 'Unknown sign-in provider.' };
    }
    return { kind: 'code', provider, code: code!, redirectUri: redirectUri() };
}
