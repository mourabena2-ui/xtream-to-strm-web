from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base_class import Base
import enum

class SourceType(str, enum.Enum):
    URL = "url"
    FILE = "file"

class M3USource(Base):
    __tablename__ = "m3u_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    source_type = Column(SQLEnum(SourceType), nullable=False)
    url = Column(String, nullable=True)  # For URL type
    file_path = Column(String, nullable=True)  # For file uploads
    output_dir = Column(String, nullable=False)  # Base output directory
    movies_dir = Column(String, nullable=True)  # Custom movies directory  
    series_dir = Column(String, nullable=True)  # Custom series directory
    is_active = Column(Boolean, default=True)
    sync_status = Column(String, default="idle") # idle, syncing, success, error
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
