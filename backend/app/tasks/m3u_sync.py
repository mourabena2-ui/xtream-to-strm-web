from app.core.celery_app import celery_app
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.m3u_source import M3USource, SourceType
from app.models.m3u_entry import M3UEntry, EntryType
from app.models.m3u_selection import M3USelection, SelectionType
from app.services.m3u_parser import parse_m3u_url, parse_m3u_file
from app.services.file_manager import FileManager
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


@celery_app.task
def sync_m3u_source_task(source_id: int, sync_types: list = None):
    """Sync M3U source - parse and generate STRM files"""
    db = SessionLocal()
    try:
        # Get M3U source
        source = db.query(M3USource).filter(M3USource.id == source_id).first()
        if not source:
            logger.error(f"M3U source {source_id} not found")
            return {"error": "Source not found"}
        
        logger.info(f"Starting M3U sync for source: {source.name}")
        
        # Update status to syncing
        source.sync_status = "syncing"
        db.commit()
        
        # Parse M3U content
        try:
            if source.source_type == SourceType.URL:
                entries = parse_m3u_url(source.url)
            else:  # FILE
                entries = parse_m3u_file(source.file_path)
        except Exception as e:
            logger.error(f"Error parsing M3U source {source.name}: {e}")
            source.sync_status = "error"
            db.commit()
            return {"error": str(e)}
        
        logger.info(f"Parsed {len(entries)} entries from {source.name}")
        
        # Clear existing entries
        db.query(M3UEntry).filter(M3UEntry.m3u_source_id == source_id).delete()
        db.commit()
        
        
        # Create output directories (base)
        Path(source.output_dir).mkdir(parents=True, exist_ok=True)
        
        # Process and cache entries
        added_count = 0
        for entry_data in entries:
            try:
                # Determine entry type
                entry_type_str = entry_data.get('entry_type', 'live')
                if entry_type_str == 'movie':
                    entry_type = EntryType.MOVIE
                elif entry_type_str == 'series':
                    entry_type = EntryType.SERIES
                else:
                    # Skip LIVE entries entirely
                    continue
                
                # Save to database
                db_entry = M3UEntry(
                    m3u_source_id=source_id,
                    title=entry_data.get('title', 'Unknown'),
                    url=entry_data['url'],
                    group_title=entry_data.get('group_title'),
                    logo=entry_data.get('logo'),
                    tvg_id=entry_data.get('tvg_id'),
                    tvg_name=entry_data.get('tvg_name'),
                    entry_type=entry_type
                )
                db.add(db_entry)
                added_count += 1
            except Exception as e:
                logger.error(f"Error caching entry {entry_data.get('title')}: {e}")
                continue
        
        # Commit cached entries
        db.commit()
        
        # Initialize file manager
        fm = FileManager(source.output_dir)
        
        
        # Get selected groups for this source
        selected_groups = db.query(M3USelection).filter(
            M3USelection.m3u_source_id == source_id
        ).all()
        
        # If no groups selected, don't generate any files
        if not selected_groups:
            logger.warning(f"No groups selected for M3U source {source.name}, skipping file generation")
            # Still save entries to cache, but don't create files
            db.commit()
            source.last_sync = datetime.utcnow()
            source.sync_status = "success"
            db.commit()
            return {
                "source_id": source_id,
                "source_name": source.name,
                "items_cached": added_count,
                "items_processed": 0,
                "status": "success",
                "message": "Entries cached but no groups selected for file generation"
            }
        
        # Build set of selected groups for quick lookup
        selected_movie_groups = {sel.group_title for sel in selected_groups if sel.selection_type == SelectionType.MOVIE}
        selected_series_groups = {sel.group_title for sel in selected_groups if sel.selection_type == SelectionType.SERIES}
        
        # Use custom directories if provided, otherwise use defaults
        movies_base = source.movies_dir or f"{source.output_dir}/movies"
        series_base = source.series_dir or f"{source.output_dir}/series"
        
        files_created = 0
        
        # Process entries for file generation
        for entry in db.query(M3UEntry).filter(M3UEntry.m3u_source_id == source_id).all():
            try:
                # Filter by sync_types if provided
                if sync_types:
                    if entry.entry_type == EntryType.MOVIE and 'movies' not in sync_types:
                        continue
                    if entry.entry_type == EntryType.SERIES and 'series' not in sync_types:
                        continue

                group = entry.group_title or "Uncategorized"
                
                # Check if this group is selected
                if entry.entry_type == EntryType.MOVIE:
                    if group not in selected_movie_groups:
                        continue
                    base_dir = movies_base
                    subdir = "movies"
                elif entry.entry_type == EntryType.SERIES:
                    if group not in selected_series_groups:
                        continue
                    base_dir = series_base
                    subdir = "series"
                else:
                    continue
                
                # Sanitize names for filesystem
                safe_group = "".join(c for c in group if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_title = "".join(c for c in entry.title if c.isalnum() or c in (' ', '-', '_')).strip()
                
                # Create group directory
                group_dir = Path(base_dir) / subdir / safe_group
                group_dir.mkdir(parents=True, exist_ok=True)
                
                # Create STRM file
                strm_path = group_dir / f"{safe_title}.strm"
                with open(strm_path, 'w') as f:
                    f.write(entry.url)
                
                files_created += 1
                
            except Exception as e:
                logger.error(f"Error processing entry {entry.title}: {e}")
                continue
        
        # Update source last_sync
        source.last_sync = datetime.utcnow()
        source.sync_status = "success"
        db.commit()
        
        logger.info(f"M3U sync completed for {source.name}: {added_count} entries cached, {files_created} files created")
        
        return {
            "source_id": source_id,
            "source_name": source.name,
            "items_cached": added_count,
            "items_processed": files_created,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error in M3U sync task for source {source_id}: {e}")
        # We need to get source again to update status if session was closed or error happened before source retrieval
        try:
            if 'source' in locals() and source:
                source.sync_status = "error"
                db.commit()
        except:
            pass
        return {"error": str(e)}
    finally:
        db.close()
