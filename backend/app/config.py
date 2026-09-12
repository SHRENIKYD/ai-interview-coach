"""Runtime configuration, read from the environment (and backend/.env if present).

The app talks to any OpenAI-compatible chat endpoint. Two are configured out of the
box - OpenRouter and Groq - selected with AI_PROVIDER.
"""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
DEFAULT_PROVIDER = "openrouter"
DEFAULT_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1)(:\d+)?"


def _int_env(name: str, fallback: int) -> int:
    try:
        value = int(os.getenv(name, "").strip())
    except (TypeError, ValueError):
        return fallback
    return value if value > 0 else fallback


@dataclass(frozen=True)
class Provider:
    name: str
    label: str
    base_url: str
    key_env: str
    default_model: str
    console_url: str


PROVIDERS: dict[str, Provider] = {
    "openrouter": Provider(
        name="openrouter",
        label="OpenRouter",
        base_url="https://openrouter.ai/api/v1",
        key_env="OPENROUTER_API_KEY",
        default_model="meta-llama/llama-3.3-70b-instruct",
        console_url="https://openrouter.ai/keys",
    ),
    "groq": Provider(
        name="groq",
        label="Groq",
        base_url="https://api.groq.com/openai/v1",
        key_env="GROQ_API_KEY",
        default_model="llama-3.3-70b-versatile",
        console_url="https://console.groq.com/keys",
    ),
}


class Settings:
    def __init__(self) -> None:
        requested = os.getenv("AI_PROVIDER", DEFAULT_PROVIDER).strip().lower()
        self.provider: Provider = PROVIDERS.get(requested, PROVIDERS[DEFAULT_PROVIDER])
        self.provider_was_recognised: bool = requested in PROVIDERS

        self.api_key: str = os.getenv(self.provider.key_env, "").strip()
        self.model: str = (
            os.getenv("AI_MODEL", "").strip() or self.provider.default_model
        )
        self.allowed_origins: list[str] = [
            origin.strip()
            for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
            if origin.strip()
        ]
        # Lets Vercel preview deployments through without listing each one.
        self.allowed_origin_regex: str = os.getenv(
            "ALLOWED_ORIGIN_REGEX", DEFAULT_ORIGIN_REGEX
        ).strip()

        # Rate limiting. Turns per window is what actually costs money.
        self.rate_limit: int = _int_env("RATE_LIMIT", 30)
        self.rate_limit_window: int = _int_env("RATE_LIMIT_WINDOW_SECONDS", 300)

    @property
    def has_api_key(self) -> bool:
        return bool(self.api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
