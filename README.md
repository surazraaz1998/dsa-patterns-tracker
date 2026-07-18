# DSA Patterns Tracker

Learn DSA through patterns, track your progress. Starts with Two Pointer.

## Stack
- Frontend: React (Vite + TypeScript) → deployed on Vercel
- Backend: FastAPI (Python) → deployed on Render (Docker)
- Database: Postgres → Neon (free tier)

## Local Development

### Backend + DB (via Docker)
```bash
docker compose up --build
```
This starts:
- Postgres on `localhost:5432` (user: `dev`, password: `dev`, db: `dsa_tracker`)
- FastAPI on `localhost:8000` (auto-reloads on code changes)

Check it's alive:
```bash
curl http://localhost:8000/
# {"status": "ok"}
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `localhost:5173` by default (Vite's default port).

## Project Structure
```
dsa-patterns-tracker/
├── frontend/          # React + TypeScript
├── backend/           # FastAPI
│   ├── app/
│   │   ├── main.py    # app entrypoint
│   │   ├── models.py  # SQLAlchemy models (next step)
│   │   ├── db.py       # DB session/engine setup (next step)
│   │   └── routes/     # API route modules (next step)
│   └── seed_data.py    # loads pattern/problem content into DB (next step)
└── docker-compose.yml # local dev orchestration
```

## Deployment (once ready)
- Backend → Render, connected to this GitHub repo, builds from `backend/Dockerfile`. Set `DATABASE_URL` env var in Render's dashboard to your Neon connection string.
- Frontend → Vercel, connected to this repo, root directory set to `frontend/`. Set API base URL as an env var pointing to your Render backend URL.

No custom domain needed to launch — `*.vercel.app` and `*.onrender.com` URLs work fine.
