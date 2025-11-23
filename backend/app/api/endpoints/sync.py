from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.sync_state import SyncState
from app.schemas import SyncStatusResponse, SyncTriggerResponse
from app.tasks.sync import sync_movies_task, sync_series_task
from app.api import deps

router = APIRouter()

@router.get("/status", response_model=List[SyncStatusResponse], dependencies=[Depends(deps.get_current_user)])
def get_sync_status(db: Session = Depends(get_db)):
    states = db.query(SyncState).all()
    return [
        SyncStatusResponse(
            type=state.type,
            status=state.status,
            last_sync=state.last_sync,
            items_added=state.items_added,
            items_deleted=state.items_deleted,
            error_message=state.error_message
        ) for state in states
    ]

@router.post("/reset", dependencies=[Depends(deps.get_current_user)])
def reset_sync_history(db: Session = Depends(get_db)):
    """Reset sync history by deleting all sync state records and cache"""
    from app.models.cache import MovieCache, SeriesCache, EpisodeCache
    
    # Delete all sync states
    db.query(SyncState).delete()
    
    # Delete all cache entries to force full resync
    db.query(MovieCache).delete()
    db.query(SeriesCache).delete()
    db.query(EpisodeCache).delete()
    
    db.commit()
    return {"message": "Sync history and cache reset successfully"}

@router.post("/movies", response_model=SyncTriggerResponse, dependencies=[Depends(deps.get_current_user)])
def trigger_movie_sync(db: Session = Depends(get_db)):
    task = sync_movies_task.delay()
    # Save task_id to sync_state
    sync_state = db.query(SyncState).filter(SyncState.type == "movies").first()
    if sync_state:
        sync_state.task_id = task.id
        db.commit()
    return SyncTriggerResponse(message="Movie sync started", task_id=task.id)

@router.post("/series", response_model=SyncTriggerResponse, dependencies=[Depends(deps.get_current_user)])
def trigger_series_sync(db: Session = Depends(get_db)):
    task = sync_series_task.delay()
    # Save task_id to sync_state
    sync_state = db.query(SyncState).filter(SyncState.type == "series").first()
    if sync_state:
        sync_state.task_id = task.id
        db.commit()
    return SyncTriggerResponse(message="Series sync started", task_id=task.id)

@router.post("/stop/{sync_type}", dependencies=[Depends(deps.get_current_user)])
def stop_sync(sync_type: str, db: Session = Depends(get_db)):
    """Stop a running sync task"""
    from app.core.celery_app import celery_app
    
    sync_state = db.query(SyncState).filter(SyncState.type == sync_type).first()
    if not sync_state or not sync_state.task_id:
        return {"message": "No running task found"}
    
    # Revoke the task
    celery_app.control.revoke(sync_state.task_id, terminate=True)
    
    # Update status
    sync_state.status = "idle"
    sync_state.task_id = None
    db.commit()
    
    return {"message": f"{sync_type.capitalize()} sync stopped successfully"}
