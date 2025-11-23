from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base_class import Base
import enum

class ExecutionStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RUNNING = "running"

class ScheduleExecution(Base):
    __tablename__ = "schedule_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    started_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(SQLEnum(ExecutionStatus), nullable=False, default=ExecutionStatus.RUNNING)
    items_processed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
