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
    PREFIX_REGEX: Optional[str] = None
    FORMAT_DATE_IN_TITLE: Optional[bool] = None
    CLEAN_NAME: Optional[bool] = None
    SERIES_USE_SEASON_FOLDERS: Optional[bool] = None
    SERIES_INCLUDE_NAME_IN_FILENAME: Optional[bool] = None

class ConfigResponse(BaseModel):
    XC_URL: Optional[str] = None
    XC_USER: Optional[str] = None
    XC_PASS: Optional[str] = None
    OUTPUT_DIR: Optional[str] = None
    MOVIES_DIR: Optional[str] = None
    SERIES_DIR: Optional[str] = None
    PREFIX_REGEX: Optional[str] = None
    FORMAT_DATE_IN_TITLE: Optional[bool] = None
    CLEAN_NAME: Optional[bool] = None
    SERIES_USE_SEASON_FOLDERS: Optional[bool] = None
    SERIES_INCLUDE_NAME_IN_FILENAME: Optional[bool] = None

class SyncStatusResponse(BaseModel):
    id: Optional[int] = None
    subscription_id: int
    type: str
    last_sync: Optional[datetime]
    status: str
    items_added: int
    items_deleted: int
    error_message: Optional[str] = None

class M3USyncStatusResponse(BaseModel):
    id: Optional[int] = None
    m3u_source_id: int
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
    item_count: int = 0

class SelectionUpdate(BaseModel):
    categories: list[CategoryBase]

class SyncResponse(BaseModel):
    categories_synced: int
    timestamp: datetime

class SubscriptionBase(BaseModel):
    name: str
    xtream_url: str
    username: str
    password: str
    movies_dir: str
    series_dir: str
    is_active: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    xtream_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    movies_dir: Optional[str] = None
    series_dir: Optional[str] = None
    is_active: Optional[bool] = None

class SubscriptionResponse(SubscriptionBase):
    id: int

    class Config:
        from_attributes = True

