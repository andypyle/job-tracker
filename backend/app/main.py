import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.account import router as account_router
from app.routers.applications import router as applications_router
from app.routers.files import router as files_router
from app.routers.opengraph import router as opengraph_router
from app.routers.settings import router as settings_router
from app.routers.stats import router as stats_router
from app.services.scheduler import start_scheduler, stop_scheduler

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("FRONTEND_URL: %s", settings.FRONTEND_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Job Application Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opengraph_router, prefix="/opengraph", tags=["opengraph"])
app.include_router(applications_router, prefix="/applications", tags=["applications"])
app.include_router(files_router, prefix="/applications", tags=["files"])
app.include_router(stats_router, prefix="/stats", tags=["stats"])
app.include_router(settings_router, prefix="/settings", tags=["settings"])
app.include_router(account_router, prefix="/account", tags=["account"])


@app.get("/health")
async def health():
    return {"data": {"status": "ok"}, "error": None}
