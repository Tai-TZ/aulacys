from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from aulacys import db
from aulacys.api.routes import router
from aulacys.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"Starting {settings.app_name} in {settings.app_env} mode")
    yield
    await db.dispose()
    print("Shutting down...")


app = FastAPI(
    title="App",
    description="",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    # db: "up" | "down" | "disabled". Never raises — a dead DB must not fail
    # the healthcheck the demo path depends on.
    if not db.is_enabled():
        db_status = "disabled"
    else:
        db_status = "up" if await db.ping() else "down"
    return {"status": "ok", "env": settings.app_env, "db": db_status}
