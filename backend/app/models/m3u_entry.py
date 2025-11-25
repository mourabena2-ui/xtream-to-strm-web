from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SQLEnum
from app.db.base_class import Base
import enum

class EntryType(str, enum.Enum):
    MOVIE = "movie"
    SERIES = "series"

class M3UEntry(Base):
    __tablename__ = "m3u_entries"

    id = Column(Integer, primary_key=True, index=True)
    m3u_source_id = Column(Integer, ForeignKey("m3u_sources.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)  # Stream URL
    group_title = Column(String, nullable=True)  # Category/group
    logo = Column(String, nullable=True)
    tvg_id = Column(String, nullable=True)
    tvg_name = Column(String, nullable=True)
    entry_type = Column(SQLEnum(EntryType), default=EntryType.MOVIE, nullable=False)
