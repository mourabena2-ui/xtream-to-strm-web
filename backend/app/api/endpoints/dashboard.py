from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.m3u_source import M3USource
from app.models.m3u_entry import M3UEntry, EntryType
from app.models.sync_state import SyncState
from app.models.schedule import Schedule
from app.models.cache import MovieCache, SeriesCache
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get overall dashboard statistics"""
    
    # Source statistics
    xtream_total = db.query(Subscription).count()
    xtream_active = db.query(Subscription).filter(Subscription.is_active == True).count()
    
    m3u_total = db.query(M3USource).count()
    m3u_active = db.query(M3USource).filter(M3USource.is_active == True).count()
    
    # Content statistics from M3U entries
    m3u_movies = db.query(M3UEntry).filter(M3UEntry.entry_type == EntryType.MOVIE).count()
    m3u_series = db.query(M3UEntry).filter(M3UEntry.entry_type == EntryType.SERIES).count()
    
    # Content statistics from Xtream Cache
    xtream_movies = db.query(MovieCache).count()
    xtream_series = db.query(SeriesCache).count()
    
    movies_count = m3u_movies + xtream_movies
    series_count = m3u_series + xtream_series
    
    # Sync status
    recent_syncs = db.query(SyncState).order_by(
        SyncState.last_sync.desc()
    ).limit(5).all()
    
    # In-progress syncs
    syncing = db.query(SyncState).filter(
        SyncState.status == "syncing"
    ).count()
    
    # Error count (last 24h)
    yesterday = datetime.utcnow() - timedelta(days=1)
    errors_24h = db.query(SyncState).filter(
        SyncState.status == "error",
        SyncState.last_sync >= yesterday
    ).count()
    
    # Success rate (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    total_syncs = db.query(SyncState).filter(
        SyncState.last_sync >= thirty_days_ago
    ).count()
    successful_syncs = db.query(SyncState).filter(
        SyncState.status == "success",
        SyncState.last_sync >= thirty_days_ago
    ).count()
    
    success_rate = (successful_syncs / total_syncs * 100) if total_syncs > 0 else 0
    
    return {
        "sources": {
            "total": xtream_total + m3u_total,
            "xtream": xtream_total,
            "m3u": m3u_total,
            "active": xtream_active + m3u_active,
            "inactive": (xtream_total - xtream_active) + (m3u_total - m3u_active)
        },
        "total_content": {
            "movies": movies_count,
            "series": series_count,
            "total": movies_count + series_count
        },
        "sync_status": {
            "in_progress": syncing,
            "errors_24h": errors_24h,
            "success_rate": round(success_rate, 1)
        }
    }


@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get recent sync activity"""
    
    recent_syncs = db.query(SyncState).order_by(
        SyncState.last_sync.desc()
    ).limit(limit).all()
    
    activity = []
    for sync in recent_syncs:
        # Determine source name and type
        source_name = "Unknown"
        source_type = "unknown"
        
        if sync.sync_type == "movies" or sync.sync_type == "series":
            # XtreamTV sync
            sub = db.query(Subscription).filter(
                Subscription.id == sync.subscription_id
            ).first()
            if sub:
                source_name = sub.name
                source_type = "xtream"
        
        # Calculate duration if we have both start and update times
        duration = None
        if sync.last_sync and sync.last_sync:
            # Estimate duration (this is approximate)
            duration = 0  # We don't track start time currently
        
        activity.append({
            "id": sync.id,
            "source_name": source_name,
            "source_type": source_type,
            "sync_type": sync.sync_type,
            "status": sync.status,
            "items_processed": (sync.items_added or 0) + (sync.items_deleted or 0),
            "timestamp": sync.last_sync.isoformat() if sync.last_sync else None,
            "duration": duration,
            "error_message": sync.error_message if sync.status == "error" else None
        })
    
    return activity


@router.get("/scheduled-syncs")
def get_scheduled_syncs(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get upcoming scheduled syncs"""
    
    schedules = db.query(Schedule).filter(
        Schedule.is_active == True
    ).all()
    
    scheduled = []
    for schedule in schedules:
        # Get source name
        source_name = "Unknown"
        source_type = "unknown"
        
        if schedule.subscription_id:
            sub = db.query(Subscription).filter(
                Subscription.id == schedule.subscription_id
            ).first()
            if sub:
                source_name = sub.name
                source_type = "xtream"
        
        # Calculate next run time
        next_run = None
        if schedule.last_run:
            if schedule.frequency == "hourly":
                next_run = schedule.last_run + timedelta(hours=1)
            elif schedule.frequency == "daily":
                next_run = schedule.last_run + timedelta(days=1)
            elif schedule.frequency == "weekly":
                next_run = schedule.last_run + timedelta(weeks=1)
        
        scheduled.append({
            "id": schedule.id,
            "source_name": source_name,
            "source_type": source_type,
            "sync_type": schedule.sync_type,
            "frequency": schedule.frequency,
            "next_run": next_run.isoformat() if next_run else None,
            "last_run": schedule.last_run.isoformat() if schedule.last_run else None
        })
    
    return scheduled


@router.get("/content-by-source")
def get_content_by_source(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get content breakdown by source"""
    
    result = []
    
    # XtreamTV sources
    subscriptions = db.query(Subscription).all()
    for sub in subscriptions:
        # Count from Cache
        movies_count = db.query(MovieCache).filter(
            MovieCache.subscription_id == sub.id
        ).count()
        
        series_count = db.query(SeriesCache).filter(
            SeriesCache.subscription_id == sub.id
        ).count()
        
        result.append({
            "source_name": sub.name,
            "source_type": "xtream",
            "movies": movies_count,
            "series": series_count,
            "total": movies_count + series_count
        })
    
    # M3U sources
    m3u_sources = db.query(M3USource).all()
    for source in m3u_sources:
        movies = db.query(M3UEntry).filter(
            M3UEntry.m3u_source_id == source.id,
            M3UEntry.entry_type == EntryType.MOVIE
        ).count()
        
        series = db.query(M3UEntry).filter(
            M3UEntry.m3u_source_id == source.id,
            M3UEntry.entry_type == EntryType.SERIES
        ).count()
        
        result.append({
            "source_name": source.name,
            "source_type": "m3u",
            "movies": movies,
            "series": series,
            "total": movies + series
        })
    
    return result
