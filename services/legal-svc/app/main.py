from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.service_name, version=settings.version)
app.include_router(router)
