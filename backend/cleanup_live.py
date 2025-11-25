from app.db.session import SessionLocal
from app.models.m3u_entry import M3UEntry
from app.models.m3u_selection import M3USelection

def cleanup_live_entries():
    db = SessionLocal()
    try:
        # Delete live entries
        deleted_entries = db.query(M3UEntry).filter(M3UEntry.entry_type == 'live').delete()
        print(f"Deleted {deleted_entries} live entries")
        
        # Delete live selections
        deleted_selections = db.query(M3USelection).filter(M3USelection.selection_type == 'live').delete()
        print(f"Deleted {deleted_selections} live selections")
        
        db.commit()
    except Exception as e:
        print(f"Error cleaning up live entries: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_live_entries()
