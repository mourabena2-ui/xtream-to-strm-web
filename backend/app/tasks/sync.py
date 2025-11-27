import asyncio
import os
import shutil
from app.core.celery_app import celery_app
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.subscription import Subscription
from app.models.sync_state import SyncState, SyncStatus, SyncType
from app.models.selection import SelectedCategory
from app.models.cache import MovieCache, SeriesCache, EpisodeCache
from app.models.schedule import Schedule, SyncType as ScheduleSyncType
from app.models.schedule_execution import ScheduleExecution, ExecutionStatus
from app.services.xtream import XtreamClient
from app.services.file_manager import FileManager
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def process_movies(db: Session, xc: XtreamClient, fm: FileManager, subscription_id: int):
    # Update status
    sync_state = db.query(SyncState).filter(
        SyncState.subscription_id == subscription_id,
        SyncState.type == SyncType.MOVIES
    ).first()
    
    if not sync_state:
        sync_state = SyncState(subscription_id=subscription_id, type=SyncType.MOVIES)
        db.add(sync_state)
    
    sync_state.status = SyncStatus.RUNNING
    sync_state.last_sync = datetime.utcnow()
    db.commit()

    try:
        # Fetch Categories
        categories = await xc.get_vod_categories()
        cat_map = {c['category_id']: c['category_name'] for c in categories}

        # Fetch All Movies
        all_movies = await xc.get_vod_streams()

        # Filter by selected categories if any
        selected_cats = db.query(SelectedCategory).filter(
            SelectedCategory.subscription_id == subscription_id,
            SelectedCategory.type == "movie"
        ).all()
        
        if selected_cats:
            selected_ids = {s.category_id for s in selected_cats}
            all_movies = [m for m in all_movies if m['category_id'] in selected_ids]
        
        # Current Cache
        cached_movies = {m.stream_id: m for m in db.query(MovieCache).filter(MovieCache.subscription_id == subscription_id).all()}
        
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
            tmdb_id = movie.get('tmdb')  # Xtream API uses 'tmdb' not 'tmdb_id'
            
            # DEBUG: Log what we receive from API
            logger.info(f"[DEBUG] Movie '{name}' (ID: {stream_id}) - TMDB ID from get_vod_streams: {tmdb_id}")

            # PERFORMANCE OPTIMIZATION: Disabled for initial sync speed
            # Fetching detailed info for every movie is too slow (2-4s per movie)
            # NFOs will use metadata directly from get_vod_streams response
            # If you need TMDB IDs, consider enabling this for incremental updates only
            #
            # if not tmdb_id or str(tmdb_id) in ['0', 'None', 'null', '']:
            #     try:
            #         detailed_info = await xc.get_vod_info(str(stream_id))
            #         if detailed_info and 'info' in detailed_info:
            #             fetched_tmdb = detailed_info['info'].get('tmdb_id')
            #             if fetched_tmdb:
            #                 tmdb_id = fetched_tmdb
            #                 movie['tmdb_id'] = tmdb_id
            #     except Exception as e:
            #         logger.warning(f"Failed to fetch detailed info for movie {stream_id}: {e}")

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
            
            # DEBUG: Log generated NFO preview
            logger.info(f"[DEBUG] Generated NFO for '{name}': {nfo_content[:200]}...")
            
            await fm.write_nfo(nfo_path, nfo_content)

            # Update Cache
            cached = cached_movies.get(stream_id)
            if not cached:
                cached = MovieCache(subscription_id=subscription_id, stream_id=stream_id)
                db.add(cached)
            
            cached.name = name
            cached.category_id = cat_id
            cached.container_extension = ext
            cached.tmdb_id = str(tmdb_id) if tmdb_id else None

        # Check for missing NFO files
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
            
            if not os.path.exists(nfo_path):
                # PERFORMANCE OPTIMIZATION: Disabled - use metadata from cache/list
                # tmdb_id = movie.get('tmdb_id')
                # if not tmdb_id or str(tmdb_id) in ['0', 'None', 'null', '']:
                #     try:
                #         detailed_info = await xc.get_vod_info(str(stream_id))
                #         if detailed_info and 'info' in detailed_info:
                #             fetched_tmdb = detailed_info['info'].get('tmdb_id')
                #             if fetched_tmdb:
                #                 movie['tmdb_id'] = fetched_tmdb
                #     except Exception:
                #         pass

                cat_dir = f"{fm.output_dir}/{safe_cat}"
                fm.ensure_directory(cat_dir)
                nfo_content = fm.generate_movie_nfo(movie)
                await fm.write_nfo(nfo_path, nfo_content)
                nfo_created_count += 1
        
        if nfo_created_count > 0:
            logger.info(f"Created {nfo_created_count} missing NFO files")

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

async def process_series(db: Session, xc: XtreamClient, fm: FileManager, subscription_id: int):
    # Update status
    sync_state = db.query(SyncState).filter(
        SyncState.subscription_id == subscription_id,
        SyncState.type == SyncType.SERIES
    ).first()
    
    if not sync_state:
        sync_state = SyncState(subscription_id=subscription_id, type=SyncType.SERIES)
        db.add(sync_state)
    
    sync_state.status = SyncStatus.RUNNING
    sync_state.last_sync = datetime.utcnow()
    db.commit()

    try:
        categories = await xc.get_series_categories()
        cat_map = {c['category_id']: c['category_name'] for c in categories}

        all_series = await xc.get_series()

        # Filter by selected categories if any
        selected_cats = db.query(SelectedCategory).filter(
            SelectedCategory.subscription_id == subscription_id,
            SelectedCategory.type == "series"
        ).all()
        
        if selected_cats:
            selected_ids = {s.category_id for s in selected_cats}
            all_series = [s for s in all_series if s['category_id'] in selected_ids]
        
        cached_series = {s.series_id: s for s in db.query(SeriesCache).filter(SeriesCache.subscription_id == subscription_id).all()}
        
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
            if os.path.exists(path):
                shutil.rmtree(path)
            
            await fm.delete_directory_if_empty(f"{fm.output_dir}/{safe_cat}")
            db.delete(series)

        # Additions/Updates
        for series in to_add_update:
            series_id = int(series['series_id'])
            name = series['name']
            cat_id = series['category_id']
            tmdb_id = series.get('tmdb')  # Xtream API uses 'tmdb' not 'tmdb_id'

            cat_name = cat_map.get(cat_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(name)
            
            series_dir = f"{fm.output_dir}/{safe_cat}/{safe_name}"
            fm.ensure_directory(series_dir)
            
            # Fetch Episodes and Info
            info_response = await xc.get_series_info(str(series_id))
            series_info = info_response.get('info', {})
            episodes_data = info_response.get('episodes', {})
            
            # PERFORMANCE: Use TMDB ID from get_series() list instead
            # The series dict already has metadata from the list call
            # if series_info.get('tmdb_id'):
            #     series['tmdb_id'] = series_info['tmdb_id']
            #     tmdb_id = series_info['tmdb_id']

            # Always create tvshow.nfo
            nfo_path = f"{series_dir}/tvshow.nfo"
            await fm.write_nfo(nfo_path, fm.generate_show_nfo(series))
            
            for season_key, episodes in episodes_data.items():
                season_num = int(season_key)
                season_dir = f"{series_dir}/Season {season_num}"
                fm.ensure_directory(season_dir)
                
                for ep in episodes:
                    ep_num = int(ep['episode_num'])
                    ep_id = ep['id']
                    container = ep['container_extension']
                    title = ep.get('title', '')
                    
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
                cached = SeriesCache(subscription_id=subscription_id, series_id=series_id)
                db.add(cached)
            
            cached.name = name
            cached.category_id = cat_id
            cached.tmdb_id = str(tmdb_id) if tmdb_id else None

        # Check for missing NFO files
        logger.info(f"Checking for missing series NFO files across {len(all_series)} series...")
        nfo_created_count = 0
        for series in all_series:
            series_id = int(series['series_id'])
            name = series['name']
            cat_id = series['category_id']
            
            cat_name = cat_map.get(cat_id, "Uncategorized")
            safe_cat = fm.sanitize_name(cat_name)
            safe_name = fm.sanitize_name(name)
            
            series_dir = f"{fm.output_dir}/{safe_cat}/{safe_name}"
            tvshow_nfo_path = f"{series_dir}/tvshow.nfo"
            
            if os.path.exists(series_dir) and not os.path.exists(tvshow_nfo_path):
                # PERFORMANCE OPTIMIZATION: Disabled - use metadata from cache/list
                # tmdb_id = series.get('tmdb_id')
                # if not tmdb_id or str(tmdb_id) in ['0', 'None', 'null', '']:
                #     try:
                #         info_response = await xc.get_series_info(str(series_id))
                #         series_info = info_response.get('info', {})
                #         if series_info.get('tmdb_id'):
                #             series['tmdb_id'] = series_info['tmdb_id']
                #     except Exception:
                #         pass

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
def sync_movies_task(subscription_id: int):
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            logger.error(f"Subscription {subscription_id} not found")
            return "Subscription not found"
        
        if not sub.is_active:
            logger.info(f"Subscription {sub.name} is inactive")
            return "Subscription inactive"

        xc = XtreamClient(sub.xtream_url, sub.username, sub.password)
        fm = FileManager(sub.movies_dir)
        
        asyncio.run(process_movies(db, xc, fm, subscription_id))
        return f"Movies synced successfully for {sub.name}"
    finally:
        db.close()

@celery_app.task
def sync_series_task(subscription_id: int):
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            logger.error(f"Subscription {subscription_id} not found")
            return "Subscription not found"
        
        if not sub.is_active:
            logger.info(f"Subscription {sub.name} is inactive")
            return "Subscription inactive"

        xc = XtreamClient(sub.xtream_url, sub.username, sub.password)
        fm = FileManager(sub.series_dir)
        
        asyncio.run(process_series(db, xc, fm, subscription_id))
        return f"Series synced successfully for {sub.name}"
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
                    result = sync_movies_task.apply_async(args=[schedule.subscription_id])
                else:
                    result = sync_series_task.apply_async(args=[schedule.subscription_id])
                
                # Update execution status
                execution.status = ExecutionStatus.SUCCESS
                execution.completed_at = datetime.utcnow()
                
                # Get items processed from sync state
                sync_state = db.query(SyncState).filter(
                    SyncState.subscription_id == schedule.subscription_id,
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
