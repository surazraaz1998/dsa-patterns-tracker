# AlgoTrack — user test of the live site

**Site:** https://dsa-pattern-practice.vercel.app/ · **API:** https://dsa-patterns-tracker.onrender.com
**How:** a first-time visitor's path, as a guest, on desktop (800 px), tablet (683 px) and phone (375 px). No account was created and nothing was submitted on production.
**Recording:** `algotrack-user-test.mp4` (57 s, 20 steps + summary card).

> **Status (Oct 30):** all 13 findings below are fixed in the code, and checked on a local build. They reach the live site with your next deploy. After deploying, check the link preview with LinkedIn's Post Inspector (linkedin.com/post-inspector), which also refreshes LinkedIn's cached preview.

## What works

- Landing → **Explore as Guest** → roadmap in one click. The API answered every call in 0.3–1.1 s (warm server).
- Ticking a roadmap item updates the bar (1 / 36) and **survives a reload** without an account.
- Roadmap lesson chips open the right lesson in every track (Sorting, Graphs, DP, Movie Booking, Multi-Step Agent).
- **Visualisers** play, step and explain each move (quick sort, bubble sort, BFS, Coin Change); BFS/DFS tabs switch on the same graph.
- **In-app video clips** play only their segment. The heap-sort button started at 17:45 and landed exactly on the max-heap explanation.
- **Quiz** marks ✗ / ✓ and explains the answer.
- **Phone layout:** no horizontal page scroll; the drawer lists all 7 tracks; the playbook reads well.
- Google and GitHub sign-in URLs are configured on the backend; EDITH reports `enabled: false`, as intended.

## Fix before you share the link — ✅ fixed

| # | Issue | Why it matters | Fix |
|---|---|---|---|
| 1 | **No Open Graph / Twitter tags**; `<title>` and description still say "DSA Patterns & Machine Coding Prep" | The LinkedIn link preview will have no image and an outdated title | Add `og:title`, `og:description`, `og:image` (1200×630), `twitter:card` to `frontend/index.html`; update title and description |
| 2 | **Landing page feature tiles and "sneak peek" describe the old app** ("15 Reusable Patterns", "Frontend Machine Coding", "15 Tiered Patterns", "Auto LeetCode Sync"); the Debounce card says "production-grade rate limiters" | First impression contradicts the hero; the best new features (visualisers, clips, roadmap) aren't mentioned | Rewrite the 3 tiles: 6-month roadmap · step-by-step visualisers · in-app video clips; update the badges |
| 3 | **Sign-in screen promises "EDITH's AI voice tutor"** | EDITH is switched off, so the promise is false | Remove the EDITH line unless `VITE_EDITH_ENABLED` is true |

## Polish — ✅ fixed

| # | Issue | Where | Suggested fix |
|---|---|---|---|
| 4 | Video player is **black for ~8–14 s** with no feedback | every clip | Show the YouTube thumbnail (`i.ytimg.com/vi/<id>/hqdefault.jpg`) with a spinner until the iframe loads |
| 5 | **DP table: the cell being filled scrolls out of view** on phones (Coin Change "Amount 8" was off-screen) | DP visualiser | Scroll the current cell into view on each step |
| 6 | **Identical clip labels** ("take U forward · full video" twice); titles only show on hover, which phones lack | lessons with 2+ full videos from one channel | Show a short label or the video title on the button |
| 7 | **"Interview playbook" tab cut off** at 375 px, with no scroll hint, even when it's the active tab | section tabs | Shorter labels on mobile ("Playbook"), or scroll the active tab into view and add an edge fade |
| 8 | Header **"0 Solved"** next to roadmap progress "1 / 36" | header | Rename to "0 problems solved", or show roadmap progress there |
| 9 | Opening a lesson from the roadmap **briefly shows the first topic** selected | roadmap → lesson | Skip loading the first topic when a specific lesson was requested |
| 10 | Long lessons (Sorting ≈ 19,800 px) scroll **inside a fixed-height box** on tablet/phone | lesson panel | Let the page scroll on small screens; add a "back to top" button |
| 11 | `user-scalable=no, maximum-scale=1` blocks pinch-zoom | `index.html` viewport | Remove both (accessibility; wide tables benefit from zoom) |
| 12 | Drawer copy says "sync solved problems" only | mobile drawer | "Sync your roadmap, quiz scores and solved problems" |
| 13 | Password placeholder is truncated ("…for new accoun") | sign-in screen | "Password (6+ characters)" |

## Not tested

- Real sign-in (Google, GitHub, email) and guest → account progress merge on production — this needs your own account.
- The Render cold start after inactivity (the server was already warm). Free Render services sleep and can take 30–60 s on the first request; consider a keep-alive ping before posting.
- Safari / iOS, and slow 3G.
