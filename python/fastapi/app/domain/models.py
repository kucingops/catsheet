"""Domain model: murni Python, NGGAK tahu soal FastAPI, SQLAlchemy, atau JSON.

Ini inti "clean/hexagonal architecture": domain di tengah, framework di pinggir.
Di Spring biasanya entity JPA dipakai langsung sebagai domain; di sini sengaja
dipisah supaya kelihatan bedanya (lihat persistence/sqlalchemy_repo.py untuk mapping).
"""

from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from enum import StrEnum


class Role(StrEnum):
    USER = "user"
    ADMIN = "admin"


@dataclass(frozen=True, slots=True)
class User:
    username: str
    password_hash: str
    roles: frozenset[Role] = frozenset({Role.USER})
    api_key: str | None = None

    def has_role(self, role: Role) -> bool:
        return role in self.roles


class DomainError(Exception):
    """Base exception domain. Di-mapping ke HTTP status di layer API."""


class NoteNotFound(DomainError):
    def __init__(self, note_id: int) -> None:
        super().__init__(f"note {note_id} tidak ditemukan")
        self.note_id = note_id


class NotOwner(DomainError):
    pass


class ArchivedNoteError(DomainError):
    pass


def _now() -> datetime:
    return datetime.now(UTC)


@dataclass(slots=True)
class Note:
    """Entity: punya identitas (id) dan behavior, bukan cuma bag of getters/setters.

    `id=None` artinya belum disimpan (transient), mirip entity JPA sebelum persist.
    """

    title: str
    body: str
    owner: str
    id: int | None = None
    archived: bool = False
    created_at: datetime = field(default_factory=_now)

    def __post_init__(self) -> None:
        self.title = self.title.strip()
        if not self.title:
            raise ValueError("title wajib diisi")
        if len(self.title) > 100:
            raise ValueError("title maksimal 100 karakter")

    # --- behavior (rich domain model, bukan anemic) ---
    def can_be_modified_by(self, user: User) -> bool:
        return self.owner == user.username or user.has_role(Role.ADMIN)

    def edit(self, *, title: str | None = None, body: str | None = None) -> None:
        if self.archived:
            raise ArchivedNoteError("note yang sudah di-archive tidak bisa diedit")
        if title is not None:
            # validasi ulang lewat __post_init__ dengan bikin copy
            self.title = replace(self, title=title).title
        if body is not None:
            self.body = body

    def archive(self) -> None:
        self.archived = True
