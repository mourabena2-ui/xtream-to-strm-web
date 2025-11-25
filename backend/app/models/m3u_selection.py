from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SQLEnum
from app.db.base_class import Base
import enum

class SelectionType(str, enum.Enum):
    MOVIE = "movie"
    SERIES = "series"

class M3USelection(Base):
    __tablename__ = "m3u_selections"

    id = Column(Integer, primary_key=True, index=True)
    m3u_source_id = Column(Integer, ForeignKey("m3u_sources.id"), nullable=False, index=True)
    group_title = Column(String, nullable=False)
    selection_type = Column(SQLEnum(SelectionType), nullable=False)  # live or vod
