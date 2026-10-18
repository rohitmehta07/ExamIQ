import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ExamIQ"
    TAGLINE: str = "Turn your study material into an intelligent exam strategy."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "examiq-secret-key-super-secure-production-ready-2026-crypto"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    RAW_DIR: str = os.path.join(DATA_DIR, "raw")
    PROCESSED_DIR: str = os.path.join(DATA_DIR, "processed")
    DOCUMENTS_DIR: str = os.path.join(BASE_DIR, "documents")
    
    # Database
    DATABASE_URL: str = f"sqlite:///{os.path.join(DATA_DIR, 'examiq.db').replace('\\', '/')}"
    
    # Weights for Topic Priority Engine (Configurable)
    WEIGHT_FREQUENCY: float = 0.25
    WEIGHT_MARKS: float = 0.25
    WEIGHT_RECENCY: float = 0.15
    WEIGHT_SYLLABUS: float = 0.15
    WEIGHT_VARIETY: float = 0.10
    WEIGHT_STUDENT_WEAKNESS: float = 0.10

    class Config:
        case_sensitive = True

settings = Settings()
