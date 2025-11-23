from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base_class import Base
import enum
from datetime import datetime, timedelta

class SyncType(str, enum.Enum):
    MOVIES = "movies"
    SERIES = "series"

class Frequency(str, enum.Enum):
    HOURLY = "hourly"
    SIX_HOURS = "six_hours"
    TWELVE_HOURS = "twelve_hours"
    DAILY = "daily"
    WEEKLY = "weekly"

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(SQLEnum(SyncType), nullable=False, unique=True)
    enabled = Column(Boolean, default=False, nullable=False)
    frequency = Column(SQLEnum(Frequency), nullable=False, default=Frequency.DAILY)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def calculate_next_run(self) -> datetime:
        """Calculate next run time based on frequency"""
        now = datetime.utcnow()
        base_time = self.last_run if self.last_run else now
        
        if self.frequency == Frequency.HOURLY:
            return base_time + timedelta(hours=1)
        elif self.frequency == Frequency.SIX_HOURS:
            return base_time + timedelta(hours=6)
        elif self.frequency == Frequency.TWELVE_HOURS:
            return base_time + timedelta(hours=12)
        elif self.frequency == Frequency.DAILY:
            return base_time + timedelta(days=1)
        elif self.frequency == Frequency.WEEKLY:
            return base_time + timedelta(weeks=1)
        return now
