from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.sync_state import SyncState
from app.models.selection import SelectedCategory
from app.models.cache import MovieCache, SeriesCache, EpisodeCache
from app.models.schedule import Schedule
from app.models.schedule_execution import ScheduleExecution
from app.models.m3u_source import M3USource
from app.models.m3u_entry import M3UEntry
from app.models.m3u_selection import M3USelection
from app.core.config import settings
import os
import shutil
import platform
from pathlib import Path

router = APIRouter()


@router.post("/delete-files")
def delete_generated_files(db: Session = Depends(get_db)):
    """Delete all generated .strm and .nfo files from all directories"""
    try:
        deleted_count = 0
        errors = []
        
        # Get all Xtream subscriptions to find their directories
        subscriptions = db.query(Subscription).all()
        
        for sub in subscriptions:
            # Delete files from movies directory
            if sub.movies_dir and os.path.exists(sub.movies_dir):
                try:
                    shutil.rmtree(sub.movies_dir)
                    os.makedirs(sub.movies_dir, exist_ok=True)
                    deleted_count += 1
                except Exception as e:
                    errors.append(f"Error deleting files from {sub.movies_dir}: {str(e)}")
            
            # Delete files from series directory
            if sub.series_dir and os.path.exists(sub.series_dir):
                try:
                    shutil.rmtree(sub.series_dir)
                    os.makedirs(sub.series_dir, exist_ok=True)
                    deleted_count += 1
                except Exception as e:
                    errors.append(f"Error deleting files from {sub.series_dir}: {str(e)}")
        
        # Get all M3U sources to find their output directories
        m3u_sources = db.query(M3USource).all()
        
        for source in m3u_sources:
            # Delete files from output directory
            if source.output_dir and os.path.exists(source.output_dir):
                try:
                    shutil.rmtree(source.output_dir)
                    os.makedirs(source.output_dir, exist_ok=True)
                    deleted_count += 1
                except Exception as e:
                    errors.append(f"Error deleting files from {source.output_dir}: {str(e)}")
        
        # Also clean the main output directory if it exists
        if hasattr(settings, 'OUTPUT_DIR') and os.path.exists(settings.OUTPUT_DIR):
            try:
                # Iterate over all items in the output directory
                for item in os.listdir(settings.OUTPUT_DIR):
                    item_path = os.path.join(settings.OUTPUT_DIR, item)
                    try:
                        if os.path.isfile(item_path) or os.path.islink(item_path):
                            os.unlink(item_path)
                            deleted_count += 1
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                            deleted_count += 1 # Count directory as 1 deletion unit
                    except Exception as e:
                        errors.append(f"Error deleting {item_path}: {str(e)}")
            except Exception as e:
                errors.append(f"Error scanning output directory: {str(e)}")
        
        return {
            "message": "Files deleted successfully",
            "deleted_count": deleted_count,
            "errors": errors if errors else None
        }
    except Exception as e:
        return {"message": f"Error deleting files: {str(e)}", "success": False}


@router.post("/clear-movie-cache")
def clear_movie_cache(db: Session = Depends(get_db)):
    """Clear only movie cache"""
    try:
        db.query(MovieCache).delete()
        db.commit()
        return {"message": "Movie cache cleared successfully", "success": True}
    except Exception as e:
        db.rollback()
        return {"message": f"Error clearing movie cache: {str(e)}", "success": False}


@router.post("/clear-series-cache")
def clear_series_cache(db: Session = Depends(get_db)):
    """Clear only series cache"""
    try:
        db.query(SeriesCache).delete()
        db.query(EpisodeCache).delete()
        db.commit()
        return {"message": "Series cache cleared successfully", "success": True}
    except Exception as e:
        db.rollback()
        return {"message": f"Error clearing series cache: {str(e)}", "success": False}


@router.post("/reset-database")
def reset_database(db: Session = Depends(get_db)):
    """Clear all data from database tables BUT preserve configuration"""
    try:
        # Delete only cache and status tables
        db.query(ScheduleExecution).delete()
        db.query(EpisodeCache).delete()
        db.query(SeriesCache).delete()
        db.query(MovieCache).delete()
        db.query(SyncState).delete()
        
        # We DO NOT delete:
        # - Subscription (User config)
        # - SelectedCategory (User preferences)
        # - Schedule (User config)
        # - SettingsModel (App config)
        # - M3USource (User config)
        # - M3USelection (User preferences)
        
        # Clear M3U Cache/Entries only
        db.query(M3UEntry).delete()
        
        db.commit()
        
        return {
            "message": "Database cache reset successfully (Configuration preserved)",
            "success": True
        }
    except Exception as e:
        db.rollback()
        return {"message": f"Error resetting database: {str(e)}", "success": False}


@router.post("/reset-all")
def reset_all_data(db: Session = Depends(get_db)):
    """Delete all files AND reset the database - complete system reset"""
    try:
        # First delete all files
        files_result = delete_generated_files(db)
        
        # Then reset database
        db_result = reset_database(db)
        
        return {
            "message": "All data reset successfully",
            "files_deleted": files_result.get("deleted_count", 0),
            "database_reset": db_result.get("success", False),
            "success": True
        }
    except Exception as e:
        return {"message": f"Error resetting all data: {str(e)}", "success": False}


@router.get("/disk-usage")
def get_disk_usage():
    """Get disk usage information for the system."""
    try:
        # Determine the path to check based on the operating system
        if platform.system() == "Windows":
            # On Windows, get the drive letter of the current working directory
            path = Path.cwd().anchor
        else:
            # On Unix-like systems, check the root directory
            path = "/"

        total, used, free = shutil.disk_usage(path)

        return {
            "message": f"Disk usage for {path}",
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "success": True
        }
    except Exception as e:
        return {"message": f"Error getting disk usage: {str(e)}", "success": False}


@router.get("/view-logs")
def view_logs(log_file_path: str = "app.log"):
    """View the content of a specified log file."""
    try:
        if not os.path.exists(log_file_path):
            return {"message": f"Log file not found at {log_file_path}", "success": False}

        with open(log_file_path, "r") as f:
            logs = f.read()

        return {
            "message": f"Content of {log_file_path}",
            "logs": logs,
            "success": True
        }
    except Exception as e:
        return {"message": f"Error reading log file: {str(e)}", "success": False}
