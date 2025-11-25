from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.m3u_source import M3USource, SourceType
from app.models.m3u_entry import M3UEntry
from app.tasks.m3u_sync import sync_m3u_source_task
from pathlib import Path
import os
import shutil

router = APIRouter()

# Schema classes (inline for simplicity)
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class M3USourceCreate(BaseModel):
    name: str
    url: str
    movies_dir: Optional[str] = None
    series_dir: Optional[str] = None
    output_dir: Optional[str] = None

class M3USourceResponse(BaseModel):
    id: int
    name: str
    source_type: str
    url: Optional[str]
    file_path: Optional[str]
    output_dir: str
    movies_dir: Optional[str]
    series_dir: Optional[str]
    is_active: bool
    sync_status: Optional[str] = "idle"
    last_sync: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class M3UEntryResponse(BaseModel):
    id: int
    title: str
    group_title: Optional[str]
    entry_type: str
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[M3USourceResponse])
def list_m3u_sources(db: Session = Depends(get_db)):
    """List all M3U sources"""
    sources = db.query(M3USource).all()
    return sources


@router.post("/url", response_model=M3USourceResponse)
def create_m3u_source_from_url(source: M3USourceCreate, db: Session = Depends(get_db)):
    """Create M3U source from URL"""
    # Check if name already exists
    existing = db.query(M3USource).filter(M3USource.name == source.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Source name already exists")
    
    # Set output directory
    output_dir = source.output_dir or f"/output/m3u/{source.name}"
    movies_dir = source.movies_dir or None
    series_dir = source.series_dir or None
    
    # Create source
    db_source = M3USource(
        name=source.name,
        source_type=SourceType.URL,
        url=source.url,
        output_dir=output_dir,
        movies_dir=movies_dir,
        series_dir=series_dir,
        is_active=True
    )
    
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    
    # Do NOT trigger sync - user must select groups first
    # sync_m3u_source_task.delay(db_source.id)
    
    return db_source


@router.post("/upload")
async def upload_m3u_file(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload M3U file and create source"""
    # Check if name already exists
    existing = db.query(M3USource).filter(M3USource.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Source name already exists")
    
    # Validate file extension
    if not file.filename.endswith(('.m3u', '.m3u8')):
        raise HTTPException(status_code=400, detail="File must be .m3u or .m3u8")
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("/app/uploads/m3u")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save uploaded file
    file_path = upload_dir / f"{name}.m3u"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Set output directory
    output_dir = f"/output/m3u/{name}"
    movies_dir = None
    series_dir = None
    
    # Create source
    db_source = M3USource(
        name=name,
        source_type=SourceType.FILE,
        file_path=str(file_path),
        output_dir=output_dir,
        movies_dir=movies_dir,
        series_dir=series_dir,
        is_active=True
    )
    
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    
    # Do NOT trigger sync - user must select groups first
    # sync_m3u_source_task.delay(db_source.id)
    
    return {"id": db_source.id, "name": db_source.name, "message": "File uploaded successfully"}


@router.post("/{source_id}/sync")
def trigger_m3u_sync(source_id: int, db: Session = Depends(get_db)):
    """Trigger sync for M3U source"""
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    # Trigger sync task
    task = sync_m3u_source_task.delay(source_id)
    
    return {"message": "Sync started", "task_id": task.id}


@router.get("/{source_id}/entries", response_model=List[M3UEntryResponse])
def get_m3u_entries(source_id: int, db: Session = Depends(get_db)):
    """Get entries for M3U source"""
    entries = db.query(M3UEntry).filter(M3UEntry.m3u_source_id == source_id).all()
    return entries


@router.delete("/{source_id}")
def delete_m3u_source(source_id: int, db: Session = Depends(get_db)):
    """Delete M3U source and its entries"""
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    # Delete entries
    db.query(M3UEntry).filter(M3UEntry.m3u_source_id == source_id).delete()
    
    # Delete output directory
    if os.path.exists(source.output_dir):
        shutil.rmtree(source.output_dir)
    
    # Delete uploaded file if exists
    if source.file_path and os.path.exists(source.file_path):
        os.remove(source.file_path)
    
    # Delete source
    db.delete(source)
    db.commit()
    
    return {"message": "M3U source deleted successfully"}


@router.put("/{source_id}")
def update_m3u_source(
    source_id: int,
    updates: M3USourceCreate,
    db: Session = Depends(get_db)
):
    """Update M3U source"""
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    # Update fields
    if updates.name and updates.name != source.name:
        # Check if new name exists
        existing = db.query(M3USource).filter(M3USource.name == updates.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Source name already exists")
        source.name = updates.name
    
    if updates.url and source.source_type == SourceType.URL:
        source.url = updates.url
    
    db.commit()
    db.refresh(source)
    
    return source
