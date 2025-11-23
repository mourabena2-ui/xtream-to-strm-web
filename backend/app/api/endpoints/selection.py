from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.selection import SelectedCategory
from app.models.category import Category
from app.models.settings import SettingsModel
from app.schemas import CategoryResponse, SelectionUpdate, SyncResponse
from app.api import deps
from app.services.xtream import XtreamClient

router = APIRouter()

def get_xtream_client(db: Session) -> XtreamClient:
    settings = {s.key: s.value for s in db.query(SettingsModel).all()}
    if not settings.get("XC_URL") or not settings.get("XC_USER") or not settings.get("XC_PASS"):
        raise HTTPException(status_code=400, detail="Xtream Codes configuration missing")
    return XtreamClient(settings["XC_URL"], settings["XC_USER"], settings["XC_PASS"])

@router.get("/movies", response_model=List[CategoryResponse])
def get_movie_categories(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Get movie categories from database"""
    # Get all categories from database
    categories = db.query(Category).filter(Category.type == "movie").all()
    
    # Get selected categories
    selected = db.query(SelectedCategory).filter(SelectedCategory.type == "movie").all()
    selected_ids = {s.category_id for s in selected}

    return [
        CategoryResponse(
            category_id=cat.category_id,
            category_name=cat.category_name,
            selected=cat.category_id in selected_ids
        )
        for cat in categories
    ]

@router.get("/series", response_model=List[CategoryResponse])
def get_series_categories(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Get series categories from database"""
    # Get all categories from database
    categories = db.query(Category).filter(Category.type == "series").all()
    
    # Get selected categories
    selected = db.query(SelectedCategory).filter(SelectedCategory.type == "series").all()
    selected_ids = {s.category_id for s in selected}

    return [
        CategoryResponse(
            category_id=cat.category_id,
            category_name=cat.category_name,
            selected=cat.category_id in selected_ids
        )
        for cat in categories
    ]

@router.post("/movies/sync", response_model=SyncResponse)
async def sync_movie_categories(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Sync movie categories from Xtream to database"""
    client = get_xtream_client(db)
    try:
        categories = await client.get_vod_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch from Xtream: {str(e)}")

    # Clear existing movie categories
    db.query(Category).filter(Category.type == "movie").delete()
    
    # Add new categories
    now = datetime.utcnow()
    for cat in categories:
        db.add(Category(
            category_id=str(cat["category_id"]),
            category_name=cat["category_name"],
            type="movie",
            last_sync=now
        ))
    
    db.commit()
    
    return SyncResponse(
        categories_synced=len(categories),
        timestamp=now
    )

@router.post("/series/sync", response_model=SyncResponse)
async def sync_series_categories(db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Sync series categories from Xtream to database"""
    client = get_xtream_client(db)
    try:
        categories = await client.get_series_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch from Xtream: {str(e)}")

    # Clear existing series categories
    db.query(Category).filter(Category.type == "series").delete()
    
    # Add new categories
    now = datetime.utcnow()
    for cat in categories:
        db.add(Category(
            category_id=str(cat["category_id"]),
            category_name=cat["category_name"],
            type="series",
            last_sync=now
        ))
    
    db.commit()
    
    return SyncResponse(
        categories_synced=len(categories),
        timestamp=now
    )

@router.post("/movies", response_model=List[CategoryResponse])
def update_movie_selection(selection: SelectionUpdate, db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Update movie category selection"""
    # Clear existing selection
    db.query(SelectedCategory).filter(SelectedCategory.type == "movie").delete()
    
    # Add new selection
    for cat in selection.categories:
        db.add(SelectedCategory(
            category_id=cat.category_id,
            name=cat.category_name,
            type="movie"
        ))
    db.commit()
    
    return [CategoryResponse(category_id=c.category_id, category_name=c.category_name, selected=True) for c in selection.categories]

@router.post("/series", response_model=List[CategoryResponse])
def update_series_selection(selection: SelectionUpdate, db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    """Update series category selection"""
    # Clear existing selection
    db.query(SelectedCategory).filter(SelectedCategory.type == "series").delete()
    
    # Add new selection
    for cat in selection.categories:
        db.add(SelectedCategory(
            category_id=cat.category_id,
            name=cat.category_name,
            type="series"
        ))
    db.commit()
    
    return [CategoryResponse(category_id=c.category_id, category_name=c.category_name, selected=True) for c in selection.categories]
