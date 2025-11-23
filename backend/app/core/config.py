from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Xtream to STRM"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    
    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Xtream Defaults (can be overridden by DB config)
    XC_URL: Optional[str] = None
    XC_USER: Optional[str] = None
    XC_PASS: Optional[str] = None
    
    # Output directories
    OUTPUT_DIR: str = "/output"
    MOVIES_DIR: str = "/output/movies"
    SERIES_DIR: str = "/output/series"

    # Security
    SECRET_KEY: str = "changethis_to_a_secure_random_string_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    ADMIN_USER: str = "admin"
    ADMIN_PASS: str = "admin"
    
    class Config:
        env_file = ".env"

settings = Settings()
