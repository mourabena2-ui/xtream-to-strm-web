from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from app.db.base_class import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, nullable=False, index=True)
    category_id = Column(String, index=True, nullable=False)
    category_name = Column(String, nullable=False)
    type = Column(String, index=True, nullable=False)  # 'movie' or 'series'
    item_count = Column(Integer, default=0)
    last_sync = Column(DateTime, default=datetime.utcnow, nullable=False)
