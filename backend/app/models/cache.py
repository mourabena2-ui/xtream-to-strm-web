from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class MovieCache(Base):
    __tablename__ = "movie_cache"

    stream_id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category_id = Column(String)
    container_extension = Column(String)
    tmdb_id = Column(String, nullable=True)
    # Hash or other field to detect changes if needed, 
    # but stream_id existence + name change is usually enough.
    # We can add a 'data_hash' if we want deep comparison.

class SeriesCache(Base):
    __tablename__ = "series_cache"

    series_id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category_id = Column(String)
    tmdb_id = Column(String, nullable=True)

class EpisodeCache(Base):
    __tablename__ = "episode_cache"

    id = Column(Integer, primary_key=True, index=True) # This is the stream_id of the episode
    series_id = Column(Integer, ForeignKey("series_cache.series_id"), index=True)
    season_num = Column(Integer)
    episode_num = Column(Integer)
    title = Column(String, nullable=True)
    container_extension = Column(String)
