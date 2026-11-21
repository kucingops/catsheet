"""Abstraksi repository: satu kontrak, banyak implementasi.

Ini pola yang sama dengan `interface NoteRepository extends JpaRepository<...>`,
bedanya di Python kita tulis sendiri implementasinya:

    memory.py          -> dict di RAM (tanpa persistence sama sekali)
    json_file.py       -> file JSON (persistence tanpa database)
    sqlite_raw.py      -> SQL manual pakai sqlite3 bawaan (mirip JdbcTemplate)
    sqlalchemy_repo.py -> ORM SQLAlchemy 2.x (mirip JPA/Hibernate)

Service cuma kenal `NoteRepository`, jadi ganti storage = ganti 1 baris config.

Kenapa `Protocol`, bukan `ABC`?
Keempat implementasi NGGAK inherit apa-apa. Mereka cukup punya method dengan bentuk
yang sama (structural typing, kayak interface di Go). Nggak ada implementasi yang
perlu di-share, jadi ABC cuma nambah coupling. Type checker (pyright/mypy) tetap
nge-cek kecocokannya, dan contract test di tests/test_repositories.py nge-cek perilakunya.
"""

from typing import Protocol

from app.domain.models import Note


class NoteRepository(Protocol):
    def save(self, note: Note) -> Note:
        """Insert kalau id None, update kalau sudah ada. Return note dengan id terisi."""
        ...

    def get(self, note_id: int) -> Note | None: ...

    def list_by_owner(self, owner: str, *, include_archived: bool = False) -> list[Note]: ...

    def list_all(self) -> list[Note]: ...

    def delete(self, note_id: int) -> bool:
        """Return True kalau ada yang dihapus."""
        ...

    def close(self) -> None: ...
