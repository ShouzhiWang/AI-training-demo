from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, agents, auth, projects
from app.config import get_settings


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(agents.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "deepseek": "configured" if settings.deepseek_api_key else "development-fallback",
        "model": (
            settings.deepseek_model
            if settings.deepseek_api_key
            else "muse-development-mentor"
        ),
        "supabase": "configured" if settings.supabase_ready else "needs-server-credentials",
    }
