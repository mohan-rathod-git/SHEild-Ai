"""
SHEildAI Backend — FastAPI Application Entry Point

Provides the main FastAPI app instance with:
- CORS middleware (allows the Vite dev server by default)
- /health endpoint for liveness probes
- v1 API router mount (to be populated in later phases)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown hooks."""
    # Startup — nothing to do yet (Supabase client is lazy-initialized)
    yield
    # Shutdown — cleanup resources if needed in the future


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Women's safety platform — Predict · Protect · Respond",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health probe ─────────────────────────────────────────────────────────
@app.get("/health", tags=["infra"])
async def health():
    """Liveness check — always returns 200 if the process is up."""
    return {"status": "ok", "service": "sheildai-backend"}


# ── API v1 routers ───────────────────────────────────────────────────────
from app.api.v1.routes_respond import router as respond_router
from app.api.v1.routes_auth import router as auth_router
from app.api.v1.routes_contacts import router as contacts_router
from app.api.v1.routes_predict import router as predict_router
from app.api.v1.routes_protect import router as protect_router

app.include_router(respond_router, prefix="/api/v1")
app.include_router(auth_router,    prefix="/api/v1")
app.include_router(contacts_router, prefix="/api/v1")
app.include_router(predict_router,  prefix="/api/v1")
app.include_router(protect_router,  prefix="/api/v1")

