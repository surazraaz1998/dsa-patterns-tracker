# DSA Patterns Tracker

A simple, polished way to study DSA patterns and work through curated practice problems. Version 1 focuses on the Two Pointer pattern and gives you a clean overview of the core ideas, problem tiers, and LeetCode links.

## What this app does
- Shows a list of DSA patterns
- Explains the revision notes for each pattern
- Lists problems grouped by tier
- Links each problem directly to LeetCode
- Uses a FastAPI backend with seeded data for a smooth first version

## Tech stack
- Frontend: React + Vite + TypeScript
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Local orchestration: Docker Compose

## Quick start

### 1) Start the backend and database
```bash
docker compose up --build
```
This starts:
- PostgreSQL on `localhost:5432`
- FastAPI on `http://localhost:8000`

You can verify the API with:
```bash
curl http://localhost:8000/
# {"status": "ok"}
```

### 2) Start the frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## Project structure
```text
dsa-patterns-tracker/
├── backend/            # FastAPI app, DB models, seeded data
│   └── app/
├── frontend/           # React + Vite UI
├── docker-compose.yml  # Local Postgres + backend setup
└── README.md           # Project overview and setup guide
```

## Environment variables
- Frontend:
  - `VITE_API_BASE_URL=http://localhost:8000`
- Backend:
  - `DATABASE_URL=postgresql://dev:dev@localhost:5432/dsa_tracker`

## Testing
```bash
cd backend
python3 -m pytest -q
```

## Deployment notes
- Deploy the frontend on Vercel with the root directory set to `frontend/`
- Set `VITE_API_BASE_URL` in Vercel to your deployed backend URL
- Deploy the backend separately (for example on Render) and point the frontend to it

This version is intentionally focused and lightweight so it can be expanded later with progress tracking, user accounts, and more patterns.
