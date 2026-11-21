"""Factory: pilih implementasi repository berdasarkan config (mirip @Profile / @ConditionalOnProperty)."""

from app.persistence.base import NoteRepository
from app.settings import Settings, Storage


def build_note_repository(settings: Settings) -> NoteRepository:
    match settings.storage:  # structural pattern matching (3.10+)
        case Storage.MEMORY:
            from app.persistence.memory import InMemoryNoteRepository

            return InMemoryNoteRepository()
        case Storage.JSON:
            from app.persistence.json_file import JsonFileNoteRepository

            return JsonFileNoteRepository(settings.json_path)
        case Storage.SQLITE:
            from app.persistence.sqlite_raw import SqliteNoteRepository

            return SqliteNoteRepository(settings.sqlite_path)
        case Storage.SQLALCHEMY:
            from app.persistence.sqlalchemy_repo import SqlAlchemyNoteRepository

            return SqlAlchemyNoteRepository(settings.database_url)
