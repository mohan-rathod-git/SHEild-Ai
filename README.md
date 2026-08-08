# SHEildAI

> **Women's Safety Platform** — _Predict · Protect · Respond_

AI-powered route safety, real-time distress detection, and an instant SOS
cascade to family, volunteers, and emergency services.

---

## Architecture

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | React + Vite + TypeScript + Tailwind CSS | Web app UI |
| **Backend** | FastAPI (Python) | Server-side logic, SOS cascade, ML scoring |
| **ML Service** | FastAPI (Python) | Risk-score inference (XGBoost / LightGBM / RF ensemble) |
| **Database / Auth / Realtime** | **Supabase Cloud** (Postgres + PostGIS) | Data, auth, realtime, storage |
| **Infra** | Docker Compose | Wires frontend + backend + ML service (DB is on Supabase Cloud) |

## Quick Start

### 1. Set up Supabase Cloud (required first)

Create a Supabase project, then link and push migrations:

```bash
cd supabase/
supabase link --project-ref <your-project-ref>
supabase db push
```

See [`supabase/README.md`](supabase/README.md) for full instructions.

### 2. Configure environment variables

```bash
# Frontend
cp frontend/.env.example frontend/.env
# → Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Backend
cp backend/.env.example backend/.env
# → Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

### 3. Run with Docker Compose

```bash
cd infra/
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| ML Service | http://localhost:8001 |
| Backend Health | http://localhost:8000/health |

### 3b. Run without Docker (local development)

```bash
# Frontend
cd frontend/
npm install
npm run dev

# Backend (separate terminal)
cd backend/
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# ML Service (separate terminal)
cd ml-service/
pip install -r requirements.txt
uvicorn inference.risk_score_api:app --reload --port 8001
```

## Project Structure

```
sheildai/
├── frontend/          React + Vite + TypeScript + Tailwind CSS
├── backend/           FastAPI service (talks to Supabase via service role key)
├── ml-service/        Risk-score ML models & inference API
├── supabase/          Supabase CLI project (migrations, config)
├── infra/             Docker Compose + Dockerfiles
├── docs/              Architecture & API documentation
└── README.md          ← You are here
```

## Three Pillars

- **Predict** — ML-scored route safety heatmaps and AI-recommended safe paths
- **Protect** — Guardian Mode with mic/motion distress detection
- **Respond** — One-tap SOS cascade: family → volunteers → police (works offline)

## Current Phase

> **Phase 1 — Scaffolding** ✅
>
> Project structure, design system, Supabase integration, and API health
> endpoints are all set up. No business logic yet.

## License

MIT