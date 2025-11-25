from fastapi import APIRouter
from app.api.endpoints import config, sync, login, selection, logs, scheduler, subscriptions, admin, m3u_sources, m3u_selection, dashboard

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(selection.router, prefix="/selection", tags=["selection"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(m3u_sources.router, prefix="/m3u-sources", tags=["m3u"])
api_router.include_router(m3u_selection.router, prefix="/m3u-selection", tags=["m3u"])
