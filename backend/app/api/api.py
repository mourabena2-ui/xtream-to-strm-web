from fastapi import APIRouter
from app.api.endpoints import config, sync, login, selection, logs, scheduler

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(selection.router, prefix="/selection", tags=["selection"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
