"""Runtime configuration, read from the environment (and backend/.env if present)."""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DEFAULT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


class Settings:
    def __init__(self) -> None:
        self.groq_api_key: str = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model: str = os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        self.allowed_origins: list[str] = [
            origin.strip()
            for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
            if origin.strip()
        ]

    @property
    def has_api_key(self) -> bool:
        return bool(self.groq_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
