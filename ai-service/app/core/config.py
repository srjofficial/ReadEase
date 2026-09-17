import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings for ReadEase AI Microservice
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Configuration
    AI_PORT: int = 8000
    AI_HOST: str = "0.0.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Microservice Security & S2S Shared Secret
    # Required for Express backend to invoke AI inference
    AI_SERVICE_SECRET: str = "readease_internal_secret_key_change_in_production"

    # CORS Restriction: Restricted to Express backend origin only (never public browser)
    ALLOWED_ORIGINS: str = "http://localhost:5000,http://server:5000"

    # File & Processing Limits
    MAX_UPLOAD_SIZE_MB: int = 25
    TESSERACT_CMD: str = ""

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
