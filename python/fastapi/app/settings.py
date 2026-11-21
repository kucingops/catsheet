"""Konfigurasi dari environment variable (mirip application.yml + @ConfigurationProperties).

Contoh:  APP_STORAGE=sqlalchemy APP_DATABASE_URL=sqlite:///./data/app.db fastapi dev app/main.py
"""

from enum import StrEnum
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Storage(StrEnum):
    MEMORY = "memory"
    JSON = "json"
    SQLITE = "sqlite"
    SQLALCHEMY = "sqlalchemy"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env")

    storage: Storage = Storage.MEMORY
    json_path: Path = Path("data/notes.json")
    sqlite_path: str = ":memory:"
    database_url: str = "sqlite+pysqlite:///:memory:"

    # JANGAN pakai default ini di production; isi lewat env / secret manager
    jwt_secret: str = "dev-secret-ganti-di-production-minimal-32-byte"
    jwt_algorithm: str = "HS256"
    jwt_ttl_minutes: int = 30
    session_secret: str = "dev-session-secret"
