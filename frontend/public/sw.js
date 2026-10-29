// AlgoTrack service worker: installable app + offline reading of lessons you've already opened.
// - Pages: network first, fall back to the cached app shell when offline.
// - Hashed build assets (/assets/*): cache first (their names change on every deploy).
// - Public lesson data (roadmap, tracks, topics, lessons, search index): network first, cached copy offline.
// - Anything private (auth, progress, learning) is never cached.

const VERSION = 'algotrack-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const PUBLIC_API = /^\/(patterns|roadmap|tracks|search-index)(\/|$)/;

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

async function networkFirst(request, fallbackUrl) {
    const cache = await caches.open(VERSION);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached = (await cache.match(request)) || (fallbackUrl && (await cache.match(fallbackUrl)));
        if (cached) return cached;
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, '/index.html'));
    } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
        event.respondWith(cacheFirst(request));
    } else if (PUBLIC_API.test(url.pathname) && !request.headers.has('Authorization')) {
        event.respondWith(networkFirst(request));
    }
    // everything else (YouTube, fonts, auth, progress) goes straight to the network
});
