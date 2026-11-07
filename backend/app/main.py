import logging
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import db
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
    await db.open_pool()
    start_scheduler()
    yield
    stop_scheduler()
    await db.close_pool()


app = FastAPI(title="Job Application Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Handlers for specific exceptions run inside CORSMiddleware, so the browser sees the 500 rather
# than a CORS failure (a bare unhandled exception skips it)
@app.exception_handler(asyncpg.PostgresError)
@app.exception_handler(asyncpg.InterfaceError)
async def database_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Database error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"data": None, "error": "Database error"})


app.include_router(opengraph_router, prefix="/opengraph", tags=["opengraph"])
app.include_router(applications_router, prefix="/applications", tags=["applications"])
app.include_router(files_router, prefix="/applications", tags=["files"])
app.include_router(stats_router, prefix="/stats", tags=["stats"])
app.include_router(settings_router, prefix="/settings", tags=["settings"])
app.include_router(account_router, prefix="/account", tags=["account"])


@app.get("/health")
async def health():
    return {"data": {"status": "ok"}, "error": None}
