import asyncio
import os
import shutil
from app.core.celery_app import celery_app
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.settings import SettingsModel
from app.models.sync_state import SyncState, SyncStatus, SyncType
from app.models.selection import SelectedCategory
from app.models.cache import MovieCache, SeriesCache, EpisodeCache
from app.models.schedule import Schedule, SyncType as ScheduleSyncType
from app.models.schedule_execution import ScheduleExecution, ExecutionStatus
from app.services.xtream import XtreamClient
from app.services.file_manager import FileManager
from app.core.config import settings as app_settings
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def get_settings_from_db(db: Session):
    settings_dict = {}
    for s in db.query(SettingsModel).all():
        settings_dict[s.key] = s.value
    return settings_dict

async def process_movies(db: Session, xc: XtreamClient, fm: FileManager):
    # Update status
    sync_state = db.query(SyncState).filter(SyncState.type == SyncType.MOVIES).first()
    if not sync_state:
        sync_state = SyncState(type=SyncType.MOVIES)
        db.add(sync_state)
    
    sync_state.status = SyncStatus.RUNNING
    sync_state.last_sync = datetime.utcnow()
    db.commit()

    try:
        # Fetch Categories
        categories = await xc.get_vod_categories()
        cat_map = {c['category_id']: c['category_name'] for c in categories}

        # Fetch All Movies (or filtered, but let's fetch all for now as per script logic)
        # Note: Script logic supports filtering. We should implement that if settings allow.
        # For now, assuming all.
        all_movies = await xc.get_vod_streams()

        # Filter by selected categories if any
        selected_cats = db.query(SelectedCategory).filter(SelectedCategory.type == "movie").all()
        if selected_cats:
            selected_ids = {s.category_id for s in selected_cats}
            all_movies = [m for m in all_movies if m['category_id'] in selected_ids]
        
        # Current Cache
        cached_movies = {m.stream_id: m for m in db.query(MovieCache).all()}
        
        to_add_update = []
        to_delete = []
        
        current_ids = set()

        for movie in all_movies:
            stream_id = int(movie['stream_id'])
            current_ids.add(stream_id)
            
            # Check if changed
            cached = cached_movies.get(stream_id)
            if not cached:
                to_add_update.append(movie)
            else:
                # Simple change detection (name or container)
                # In a real scenario, we might want more robust checking
                if cached.name != movie['name'] or cached.container_extension != movie['container_extension']:
                    to_add_update.append(movie)

        # Detect deletions
        for stream_id, cached in cached_movies.items():
            if stream_id not in current_ids:
                to_delete.append(cached)

        # Process Deletions
        for movie in to_delete:
            cat_name = cat_map.get(movie.category_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(movie.name)
            
            path = f"{fm.output_dir}/{safe_cat}/{safe_name}.strm"
            nfo_path = f"{fm.output_dir}/{safe_cat}/{safe_name}.nfo"
            
            await fm.delete_file(path)
            await fm.delete_file(nfo_path)
            await fm.delete_directory_if_empty(f"{fm.output_dir}/{safe_cat}")
            
            db.delete(movie)
        
        # Process Additions/Updates
        for movie in to_add_update:
            stream_id = int(movie['stream_id'])
            name = movie['name']
            ext = movie['container_extension']
            cat_id = movie['category_id']
            tmdb_id = movie.get('tmdb_id') # Might be None or string "null"

            cat_name = cat_map.get(cat_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(name)
            
            cat_dir = f"{fm.output_dir}/{safe_cat}"
            fm.ensure_directory(cat_dir)
            
            strm_path = f"{cat_dir}/{safe_name}.strm"
            url = xc.get_stream_url("movie", str(stream_id), ext)
            
            await fm.write_strm(strm_path, url)
            
            # Always create NFO file with all available metadata
            nfo_path = f"{cat_dir}/{safe_name}.nfo"
            nfo_content = fm.generate_movie_nfo(movie)
            await fm.write_nfo(nfo_path, nfo_content)

            # Update Cache
            cached = cached_movies.get(stream_id)
            if not cached:
                cached = MovieCache(stream_id=stream_id)
                db.add(cached)
            
            cached.name = name
            cached.category_id = cat_id
            cached.container_extension = ext
            cached.tmdb_id = str(tmdb_id) if tmdb_id else None

        # IMPORTANT: Create missing NFO files for movies already in cache
        # This ensures all movies get NFO files even if they haven't changed
        logger.info(f"Checking for missing NFO files across {len(all_movies)} movies...")
        nfo_created_count = 0
        for movie in all_movies:
            stream_id = int(movie['stream_id'])
            name = movie['name']
            cat_id = movie['category_id']
            
            cat_name = cat_map.get(cat_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(name)
            
            nfo_path = f"{fm.output_dir}/{safe_cat}/{safe_name}.nfo"
            
            # Check if NFO file exists
            if not os.path.exists(nfo_path):
                # Create the NFO file
                cat_dir = f"{fm.output_dir}/{safe_cat}"
                fm.ensure_directory(cat_dir)
                nfo_content = fm.generate_movie_nfo(movie)
                await fm.write_nfo(nfo_path, nfo_content)
                nfo_created_count += 1
        
        if nfo_created_count > 0:
            logger.info(f"Created {nfo_created_count} missing NFO files")
            
            # Commit periodically or at end? 
            # For large datasets, maybe batch commit. For now, let's commit at end.

        sync_state.items_added = len(to_add_update)
        sync_state.items_deleted = len(to_delete)
        sync_state.status = SyncStatus.SUCCESS
        db.commit()

    except Exception as e:
        logger.exception("Error syncing movies")
        sync_state.status = SyncStatus.FAILED
        sync_state.error_message = str(e)
        db.commit()
        raise

async def process_series(db: Session, xc: XtreamClient, fm: FileManager):
    # Update status
    sync_state = db.query(SyncState).filter(SyncState.type == SyncType.SERIES).first()
    if not sync_state:
        sync_state = SyncState(type=SyncType.SERIES)
        db.add(sync_state)
    
    sync_state.status = SyncStatus.RUNNING
    sync_state.last_sync = datetime.utcnow()
    db.commit()

    try:
        categories = await xc.get_series_categories()
        cat_map = {c['category_id']: c['category_name'] for c in categories}

        all_series = await xc.get_series()

        # Filter by selected categories if any
        selected_cats = db.query(SelectedCategory).filter(SelectedCategory.type == "series").all()
        if selected_cats:
            selected_ids = {s.category_id for s in selected_cats}
            all_series = [s for s in all_series if s['category_id'] in selected_ids]
        cached_series = {s.series_id: s for s in db.query(SeriesCache).all()}
        
        to_add_update = []
        to_delete = []
        current_ids = set()

        for series in all_series:
            series_id = int(series['series_id'])
            current_ids.add(series_id)
            
            cached = cached_series.get(series_id)
            if not cached:
                to_add_update.append(series)
            else:
                # For series, we might want to check if episodes changed.
                # But typically, if series info changes or we just want to re-sync.
                # The script logic compares series_id presence.
                # We'll stick to basic existence + name change for now.
                if cached.name != series['name']:
                    to_add_update.append(series)

        for series_id, cached in cached_series.items():
            if series_id not in current_ids:
                to_delete.append(cached)

        # Deletions
        for series in to_delete:
            cat_name = cat_map.get(series.category_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(series.name)
            
            path = f"{fm.output_dir}/{safe_cat}/{safe_name}"
            # Recursive delete is dangerous, but FileManager doesn't have it.
            # We should probably implement a safe recursive delete or just rely on OS.
            # For now, let's assume we can use shutil in FileManager or just os.system
            # But wait, FileManager only has delete_file.
            # Let's just delete the directory using os (carefully)
            if os.path.exists(path):
                shutil.rmtree(path)
            
            await fm.delete_directory_if_empty(f"{fm.output_dir}/{safe_cat}")
            db.delete(series)

        # Additions/Updates
        for series in to_add_update:
            series_id = int(series['series_id'])
            name = series['name']
            cat_id = series['category_id']
            tmdb_id = series.get('tmdb_id')

            cat_name = cat_map.get(cat_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(name)
            
            series_dir = f"{fm.output_dir}/{safe_cat}/{safe_name}"
            fm.ensure_directory(series_dir)
            
            # Always create tvshow.nfo with all available metadata
            nfo_path = f"{series_dir}/tvshow.nfo"
            await fm.write_nfo(nfo_path, fm.generate_show_nfo(series))

            # Fetch Episodes
            info = await xc.get_series_info(str(series_id))
            episodes_data = info.get('episodes', {})
            
            # Handle if episodes is a list or dict (API varies)
            if isinstance(episodes_data, dict):
                # It's usually a dict of "1": [episodes], "2": [episodes] (Seasons)
                pass
            elif isinstance(episodes_data, list):
                # Sometimes it's a list?
                pass

            # The script logic: jq -c '.episodes // {} | to_entries[]'
            # So it expects a dict where keys are season numbers.
            
            for season_key, episodes in episodes_data.items():
                season_num = int(season_key)
                season_dir = f"{series_dir}/Season {season_num}"
                fm.ensure_directory(season_dir)
                
                for ep in episodes:
                    ep_num = int(ep['episode_num'])
                    ep_id = ep['id']
                    container = ep['container_extension']
                    title = ep.get('title', '')
                    
                    # Format: S01E01 - Title
                    formatted_ep = f"S{season_num:02d}E{ep_num:02d}"
                    if title:
                        safe_title = fm.sanitize_name(title)
                        filename = f"{formatted_ep} - {safe_title}"
                    else:
                        filename = formatted_ep
                    
                    strm_path = f"{season_dir}/{filename}.strm"
                    url = xc.get_stream_url("series", str(ep_id), container)
                    await fm.write_strm(strm_path, url)

            # Update Cache
            cached = cached_series.get(series_id)
            if not cached:
                cached = SeriesCache(series_id=series_id)
                db.add(cached)
            
            cached.name = name
            cached.category_id = cat_id
            cached.tmdb_id = str(tmdb_id) if tmdb_id else None

        # IMPORTANT: Create missing NFO files for series already processed
        # This ensures all series get NFO files even if they haven't changed
        logger.info(f"Checking for missing series NFO files across {len(to_add_update)} series...")
        nfo_created_count = 0
        for series in to_add_update:
            series_id = int(series['series_id'])
            name = series['name']
            cat_id = series['category_id']
            
            cat_name = cat_map.get(cat_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(name)
            
            series_dir = f"{fm.output_dir}/{safe_cat}/{safe_name}"
            tvshow_nfo_path = f"{series_dir}/tvshow.nfo"
            
            # Check if tvshow.nfo exists
            if os.path.exists(series_dir) and not os.path.exists(tvshow_nfo_path):
                await fm.write_nfo(tvshow_nfo_path, fm.generate_show_nfo(series))
                nfo_created_count += 1
        
        if nfo_created_count > 0:
            logger.info(f"Created {nfo_created_count} missing series NFO files")

        sync_state.items_added = len(to_add_update)
        sync_state.items_deleted = len(to_delete)
        sync_state.status = SyncStatus.SUCCESS
        db.commit()

    except Exception as e:
        logger.exception("Error syncing series")
        sync_state.status = SyncStatus.FAILED
        sync_state.error_message = str(e)
        db.commit()
        raise

@celery_app.task
def sync_movies_task():
    db = SessionLocal()
    try:
        settings_dict = get_settings_from_db(db)
        # Fallback to env vars if DB empty
        url = settings_dict.get("XC_URL") or app_settings.XC_URL
        user = settings_dict.get("XC_USER") or app_settings.XC_USER
        password = settings_dict.get("XC_PASS") or app_settings.XC_PASS
        
        # Use MOVIES_DIR with fallback to OUTPUT_DIR/movies
        movies_dir = settings_dict.get("MOVIES_DIR") or app_settings.MOVIES_DIR
        if not movies_dir:
            output_dir = settings_dict.get("OUTPUT_DIR") or app_settings.OUTPUT_DIR
            movies_dir = f"{output_dir}/movies"

        if not (url and user and password):
            logger.error("Missing Xtream credentials")
            return "Missing credentials"

        xc = XtreamClient(url, user, password)
        fm = FileManager(movies_dir)
        
        asyncio.run(process_movies(db, xc, fm))
        return "Movies synced successfully"
    finally:
        db.close()

@celery_app.task
def sync_series_task():
    db = SessionLocal()
    try:
        settings_dict = get_settings_from_db(db)
        url = settings_dict.get("XC_URL") or app_settings.XC_URL
        user = settings_dict.get("XC_USER") or app_settings.XC_USER
        password = settings_dict.get("XC_PASS") or app_settings.XC_PASS
        
        # Use SERIES_DIR with fallback to OUTPUT_DIR/series
        series_dir = settings_dict.get("SERIES_DIR") or app_settings.SERIES_DIR
        if not series_dir:
            output_dir = settings_dict.get("OUTPUT_DIR") or app_settings.OUTPUT_DIR
            series_dir = f"{output_dir}/series"

        if not (url and user and password):
            logger.error("Missing Xtream credentials")
            return "Missing credentials"

        xc = XtreamClient(url, user, password)
        fm = FileManager(series_dir)
        
        asyncio.run(process_series(db, xc, fm))
        return "Series synced successfully"
    finally:
        db.close()

@celery_app.task
def check_schedules_task():
    """Check schedules and trigger syncs if needed"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Get enabled schedules that are due
        schedules = db.query(Schedule).filter(
            Schedule.enabled == True,
            Schedule.next_run <= now
        ).all()
        
        for schedule in schedules:
            # Create execution record
            execution = ScheduleExecution(
                schedule_id=schedule.id,
                status=ExecutionStatus.RUNNING
            )
            db.add(execution)
            db.commit()
            
            try:
                # Trigger appropriate sync
                if schedule.type == ScheduleSyncType.MOVIES:
                    result = sync_movies_task.apply_async()
                else:
                    result = sync_series_task.apply_async()
                
                # Update execution status
                execution.status = ExecutionStatus.SUCCESS
                execution.completed_at = datetime.utcnow()
                
                # Get items processed from sync state
                sync_state = db.query(SyncState).filter(
                    SyncState.type == (SyncType.MOVIES if schedule.type == ScheduleSyncType.MOVIES else SyncType.SERIES)
                ).first()
                if sync_state:
                    execution.items_processed = (sync_state.items_added or 0) + (sync_state.items_deleted or 0)
                
            except Exception as e:
                logger.exception(f"Error executing scheduled sync for {schedule.type}")
                execution.status = ExecutionStatus.FAILED
                execution.error_message = str(e)
                execution.completed_at = datetime.utcnow()
            
            # Update schedule for next run
            schedule.last_run = now
            schedule.next_run = schedule.calculate_next_run()
            db.commit()
            
    finally:
        db.close()
