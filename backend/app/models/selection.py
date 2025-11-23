from sqlalchemy import Column, String, Integer
from app.db.base_class import Base

class SelectedCategory(Base):
    __tablename__ = "selected_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(String, index=True)
    type = Column(String, index=True) # 'movie' or 'series'
    name = Column(String)
