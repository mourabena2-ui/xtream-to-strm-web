from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
import os

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Serve frontend static files
static_dir = "/app/static"
# Check for local development path
if not os.path.exists(static_dir):
    local_static = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "dist")
    if os.path.exists(local_static):
        static_dir = local_static

if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve API routes first
        if full_path.startswith("api/"):
            return {"error": "Not found"}
        
        # Serve index.html for all other routes (SPA)
        file_path = f"{static_dir}/{full_path}" if full_path else f"{static_dir}/index.html"
        
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        else:
            return FileResponse(f"{static_dir}/index.html")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

