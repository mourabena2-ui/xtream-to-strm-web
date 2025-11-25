from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from app.db.session import get_db
from app.models.m3u_source import M3USource
from app.models.m3u_entry import M3UEntry, EntryType
from app.models.m3u_selection import M3USelection, SelectionType
from pydantic import BaseModel

router = APIRouter()

# Schemas
class GroupInfo(BaseModel):
    group_title: str
    entry_type: str
    count: int
    selected: bool

class GroupSelectionRequest(BaseModel):
    groups: List[Dict[str, str]]  # [{"group_title": "...", "type": "live|vod"}]


@router.get("/{source_id}/groups", response_model=List[GroupInfo])
def get_m3u_groups(source_id: int, db: Session = Depends(get_db)):
    """Get all groups from M3U source with selection status"""
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    # Get all entries for this source
    entries = db.query(M3UEntry).filter(M3UEntry.m3u_source_id == source_id).all()
    
    if not entries:
        return []
    
    # Get selected groups
    selected_groups = db.query(M3USelection).filter(
        M3USelection.m3u_source_id == source_id
    ).all()
    
    selected_set = {(sel.group_title, sel.selection_type.value) for sel in selected_groups}
    
    # Group by group_title and entry_type
    groups_dict = {}
    for entry in entries:
        group = entry.group_title or "Uncategorized"
        entry_type = entry.entry_type.value
        key = (group, entry_type)
        
        if key not in groups_dict:
            groups_dict[key] = {
                "group_title": group,
                "entry_type": entry_type,
                "count": 0,
                "selected": key in selected_set
            }
        groups_dict[key]["count"] += 1
    
    return list(groups_dict.values())


@router.get("/{source_id}/selected", response_model=List[GroupInfo])
def get_selected_groups(source_id: int, db: Session = Depends(get_db)):
    """Get only selected groups for M3U source"""
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    selected_groups = db.query(M3USelection).filter(
        M3USelection.m3u_source_id == source_id
    ).all()
    
    result = []
    for sel in selected_groups:
        # Get count from entries
        count = db.query(M3UEntry).filter(
            M3UEntry.m3u_source_id == source_id,
            M3UEntry.group_title == sel.group_title,
            M3UEntry.entry_type == EntryType(sel.selection_type.value)
        ).count()
        
        result.append({
            "group_title": sel.group_title,
            "entry_type": sel.selection_type.value,
            "count": count,
            "selected": True
        })
    
    return result


@router.post("/{source_id}")
def save_group_selection(
    source_id: int,
    request: GroupSelectionRequest,
    db: Session = Depends(get_db)
):
    """Save selected groups for M3U source"""
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    # Clear existing selections
    db.query(M3USelection).filter(M3USelection.m3u_source_id == source_id).delete()
    
    # Add new selections
    for group_data in request.groups:
        selection_type = SelectionType(group_data["type"])
        
        selection = M3USelection(
            m3u_source_id=source_id,
            group_title=group_data["group_title"],
            selection_type=selection_type
        )
        db.add(selection)
    
    db.commit()
    
    return {"message": f"Saved {len(request.groups)} group selections"}


class SyncRequest(BaseModel):
    sync_types: List[str] = None  # ["movies", "series"] or None for all

@router.post("/{source_id}/sync")
def sync_m3u_groups(
    source_id: int, 
    request: SyncRequest = None,
    db: Session = Depends(get_db)
):
    """Sync M3U source to fetch and cache groups (without generating files)"""
    from app.tasks.m3u_sync import sync_m3u_source_task
    
    source = db.query(M3USource).filter(M3USource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="M3U source not found")
    
    # Trigger sync task
    sync_types = request.sync_types if request else None
    task = sync_m3u_source_task.delay(source_id, sync_types)
    
    return {"message": "Group sync started", "task_id": task.id}
