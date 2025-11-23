from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ConfigUpdate(BaseModel):
    XC_URL: Optional[str] = None
    XC_USER: Optional[str] = None
    XC_PASS: Optional[str] = None
    OUTPUT_DIR: Optional[str] = None
    MOVIES_DIR: Optional[str] = None
    SERIES_DIR: Optional[str] = None

class ConfigResponse(BaseModel):
    XC_URL: Optional[str] = None
    XC_USER: Optional[str] = None
    XC_PASS: Optional[str] = None
    OUTPUT_DIR: Optional[str] = None
    MOVIES_DIR: Optional[str] = None
    SERIES_DIR: Optional[str] = None

class SyncStatusResponse(BaseModel):
    type: str
    last_sync: Optional[datetime]
    status: str
    items_added: int
    items_deleted: int
    error_message: Optional[str] = None

class SyncTriggerResponse(BaseModel):
    message: str
    task_id: str

class CategoryBase(BaseModel):
    category_id: str
    category_name: str

class CategoryResponse(CategoryBase):
    selected: bool

class SelectionUpdate(BaseModel):
    categories: list[CategoryBase]

class SyncResponse(BaseModel):
    categories_synced: int
    timestamp: datetime

