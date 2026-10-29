# AlgoTrack — Interview Prep for Job Switchers

A free, open-source **6-month roadmap** to get interview-ready for senior engineering roles: **DSA, High-Level Design, Low-Level Design and Agentic AI**, taught in simple lessons with dry runs, templates, practice lists and quizzes.

> Built for my own job switch, shared so others can use it and add to it. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

Open the app and you land on a **24-week roadmap** with three tracks running in parallel every week: **DSA**, **System Design (High- and Low-Level)** and **Agentic AI**. Tick items off as you finish them; progress is saved in your browser and syncs to your account when you sign in.

Every roadmap item opens a **lesson** in the same simple format:

1. **In simple words**, plus a real-life analogy
2. **Deep dive**: detailed sections on how it works, why it works, the variations and the edge cases — with **YouTube clips that play inside the app** (only the relevant part of the video) and **step-by-step visualisers** you can play, pause, step through and feed your own input: every sorting method, binary search, two pointers, sliding window, linked lists, tree traversals and BST search, BFS/DFS on graphs, and DP tables
3. **When to use it**: how to recognise it in an interview
4. **Dry run**: a worked example traced step by step
5. **Template**: reusable code in Python and JavaScript, with complexity
6. **Common mistakes** and **what interviewers look for**
7. **Check yourself**: a short quiz (your best score is saved)
8. **Practice, easy to hard**: curated LeetCode / design questions with hints and answers

Weeks 1–16 are full lessons. Weeks 17–24 have an outline (key points, resources, practice list) for now; the full lessons are being written.

There's also an **Interview playbook** with round-by-round rules for DSA, HLD and LLD.

| Track | Covers |
|---|---|
| 🧠 DSA | Basics → arrays, strings, two pointers, sliding window, linked lists, recursion, stacks & queues, trees, BST → heaps, greedy, graphs, union-find, DP, tries, bits |
| 🏗️ High-Level Design | Requirements & estimation, building blocks, messaging, ticketing, Instagram, e-commerce, proximity, Tinder, Uber, Twitter, YouTube, task scheduler |
| 🧩 Low-Level Design | OOP/SOLID/UML, design patterns, Parking Lot, Vending Machine, Rate Limiter, Elevator, Snake & Ladders, Library, Movie Booking, Car Rental, Job Scheduler, Inventory, Ride Sharing |
| 🤖 Agentic AI | Python for AI, Claude API (tools, structured output, context), MCP servers, RAG with pgvector, LangGraph, evals, observability, guardrails, portfolio project |
| 🎨 Frontend · 💻 CS Fundamentals · 🤝 Behavioral | Extra practice for those rounds |

All content lives in [`content/`](content) as plain JSON: one file per track, plus `roadmap.json` for the weekly plan. **Adding or improving a lesson is a one-file PR**; see [CONTRIBUTING.md](CONTRIBUTING.md).

## EDITH (paused)

The Hinglish voice tutor is switched off for now while the focus is on lessons. The code is still in `frontend/src/voice/` and `backend/app/routes/voice.py`. To turn it back on, set `EDITH_ENABLED=true` on the backend and build the frontend with `VITE_EDITH_ENABLED=true`.

## Quick start (local)

```bash
# Backend (FastAPI) — uses SQLite automatically if DATABASE_URL is empty
cd backend
cp .env.example .env          # set JWT_SECRET
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
# Frontend (React + Vite)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Or with Docker (Postgres + backend): `docker compose up --build`.

## Project structure

```text
├── content/              # 📚 Curriculum: one JSON file per track + roadmap.json (edit me!)
├── backend/              # FastAPI API
│   ├── app/
│   │   ├── content_loader.py   # reads content/*.json
│   │   ├── seed_data.py        # syncs content into the DB (never wipes progress)
│   │   └── routes/             # auth, patterns/tracks/roadmap, progress, learning, voice (paused)
│   └── tests/
└── frontend/             # React + Vite + Tailwind
    └── src/
        ├── components/   # UI
        ├── context/      # auth, track and learning-progress state
        ├── services/     # API client, OAuth helpers
        └── voice/        # EDITH (paused): speech wrappers, offline tutor, panel
```

## Configuration

Backend (`backend/.env`, see [`.env.example`](backend/.env.example)):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres URL; empty → local SQLite |
| `JWT_SECRET` | **Required in production.** Signs session tokens |
| `EDITH_ENABLED` | `true` to re-enable the paused voice tutor (default `false`) |
| `ANTHROPIC_API_KEY` | EDITH AI mode (only when EDITH is enabled) |
| `EDITH_MODEL` | Defaults to `claude-opus-5-5` |
| `EDITH_DAILY_TURN_LIMIT` | Per-user daily cap on EDITH turns (default 200) |
| `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` | OAuth sign-in. Callback/redirect URL = your frontend origin |

Frontend: `VITE_API_BASE_URL` (defaults to `http://localhost:8000` in dev), `VITE_EDITH_ENABLED` (default off).

## Tests

```bash
cd backend && python3 -m pytest -q
cd frontend && npm run build
```

## Deployment

- **Frontend** → Vercel (root `vercel.json` builds `frontend/`). Set `VITE_API_BASE_URL`.
- **Backend** → Render via [`render.yaml`](render.yaml) (Docker; generates `JWT_SECRET`). Add `ANTHROPIC_API_KEY` and the OAuth secrets in the Render dashboard.

## License & credits

Built with 💻 & ☕ by [Suraj Raj](https://github.com/surazraaz1998). Problem links point to LeetCode / GeeksforGeeks; all explanations are original.
