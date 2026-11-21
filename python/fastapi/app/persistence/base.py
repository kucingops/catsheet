"""Abstraksi repository: satu kontrak, banyak implementasi.

Ini pola yang sama dengan `interface NoteRepository extends JpaRepository<...>`,
bedanya di Python kita tulis sendiri implementasinya:

    memory.py          -> dict di RAM (tanpa persistence sama sekali)
    json_file.py       -> file JSON (persistence tanpa database)
    sqlite_raw.py      -> SQL manual pakai sqlite3 bawaan (mirip JdbcTemplate)
    sqlalchemy_repo.py -> ORM SQLAlchemy 2.x (mirip JPA/Hibernate)

Service cuma kenal `NoteRepository`, jadi ganti storage = ganti 1 baris config.
"""

from abc import ABC, abstractmethod

from app.domain.models import Note


class NoteRepository(ABC):
    @abstractmethod
    def save(self, note: Note) -> Note:
        """Insert kalau id None, update kalau sudah ada. Return note dengan id terisi."""

    @abstractmethod
    def get(self, note_id: int) -> Note | None: ...

    @abstractmethod
    def list_by_owner(self, owner: str, *, include_archived: bool = False) -> list[Note]: ...

    @abstractmethod
    def list_all(self) -> list[Note]: ...

    @abstractmethod
    def delete(self, note_id: int) -> bool:
        """Return True kalau ada yang dihapus."""

    def close(self) -> None:  # hook opsional, bukan abstract (default no-op)
        return None
