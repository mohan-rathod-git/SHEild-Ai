# SHEildAI — Architecture

## Overview

SHEildAI is a monorepo web application for women's safety with three core pillars:

1. **Predict** — AI-powered safe route planning with risk heatmaps
2. **Protect** — In-session distress detection via mic/motion sensors
3. **Respond** — SOS cascade to trusted contacts, volunteers, and authorities

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  Vite + TypeScript + Tailwind CSS                    │
│  └── @supabase/supabase-js (anon key)               │
└────────┬───────────────────────────────┬─────────────┘
         │ REST/WebSocket                │ Realtime
         ▼                               ▼
┌────────────────┐              ┌────────────────────┐
│  Backend API   │◄────────────►│  Supabase Cloud    │
│  (FastAPI)     │  service key │  ┌──────────────┐  │
│  port 8000     │──────────────│  │ Postgres     │  │
└───────┬────────┘              │  │ + PostGIS    │  │
        │ internal              │  ├──────────────┤  │
        ▼                       │  │ Auth         │  │
┌────────────────┐              │  ├──────────────┤  │
│  ML Service    │              │  │ Realtime     │  │
│  (FastAPI)     │              │  ├──────────────┤  │
│  port 8001     │              │  │ Storage      │  │
└────────────────┘              └──┴──────────────┴──┘
```

## Key Design Decisions

- **Supabase as primary data layer**: Auth, Postgres, Realtime, and Storage are all
  managed by Supabase Cloud. No self-hosted database in Docker Compose.
- **FastAPI for server-side secrets**: The backend exists only for operations that
  require the service role key (SOS cascade, ML scoring, admin writes).
- **Separate ML service**: Keeps heavy ML dependencies isolated from the API server.
  The backend calls the ML service internally over HTTP.
- **Tailwind CSS v4 with dark theme**: High-contrast safety-app palette where coral/red
  is reserved exclusively for SOS/danger states.
