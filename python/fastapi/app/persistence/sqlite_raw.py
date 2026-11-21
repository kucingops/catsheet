"""Persistence pakai SQL mentah (DB-API / sqlite3 bawaan). Setara JdbcTemplate.

Poin interview:
- SELALU parameter binding (`?` atau `:name`), JANGAN f-string -> SQL injection.
- Mapping row -> object ditulis manual (RowMapper di Spring).
- `with conn:` = transaksi: commit kalau sukses, rollback kalau exception.
"""

import sqlite3
from datetime import datetime
from threading import Lock

from app.domain.models import Note
from app.persistence.base import NoteRepository

_SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    owner      TEXT    NOT NULL,
    archived   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_notes_owner ON notes(owner);
"""


class SqliteNoteRepository(NoteRepository):
    def __init__(self, dsn: str = ":memory:") -> None:
        # check_same_thread=False karena FastAPI pakai threadpool; kita jaga pakai Lock
        self._conn = sqlite3.connect(dsn, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row  # akses kolom pakai nama: row["title"]
        self._lock = Lock()
        with self._conn:
            self._conn.executescript(_SCHEMA)

    @staticmethod
    def _map(row: sqlite3.Row) -> Note:  # "RowMapper"
        return Note(
            id=row["id"],
            title=row["title"],
            body=row["body"],
            owner=row["owner"],
            archived=bool(row["archived"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def save(self, note: Note) -> Note:
        params = {
            "id": note.id,
            "title": note.title,
            "body": note.body,
            "owner": note.owner,
            "archived": int(note.archived),
            "created_at": note.created_at.isoformat(),
        }
        with self._lock, self._conn:  # transaksi
            if note.id is None:
                cur = self._conn.execute(
                    "INSERT INTO notes (title, body, owner, archived, created_at) "
                    "VALUES (:title, :body, :owner, :archived, :created_at)",
                    params,
                )
                note.id = cur.lastrowid
            else:
                self._conn.execute(
                    "UPDATE notes SET title=:title, body=:body, archived=:archived WHERE id=:id",
                    params,
                )
        return self.get(note.id)  # type: ignore[return-value, arg-type]

    def get(self, note_id: int) -> Note | None:
        row = self._conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        return self._map(row) if row else None

    def list_by_owner(self, owner: str, *, include_archived: bool = False) -> list[Note]:
        sql = "SELECT * FROM notes WHERE owner = ?"
        if not include_archived:
            sql += " AND archived = 0"
        return [self._map(r) for r in self._conn.execute(sql + " ORDER BY id", (owner,))]

    def list_all(self) -> list[Note]:
        return [self._map(r) for r in self._conn.execute("SELECT * FROM notes ORDER BY id")]

    def delete(self, note_id: int) -> bool:
        with self._lock, self._conn:
            return self._conn.execute("DELETE FROM notes WHERE id = ?", (note_id,)).rowcount > 0

    def close(self) -> None:
        self._conn.close()
