"""Tanpa persistence: data hilang saat app restart. Cocok buat test & prototyping."""

from copy import deepcopy
from itertools import count
from threading import Lock

from app.domain.models import Note
from app.persistence.base import NoteRepository


class InMemoryNoteRepository(NoteRepository):
    def __init__(self) -> None:
        self._data: dict[int, Note] = {}
        self._ids = count(1)
        # FastAPI jalanin endpoint `def` (sync) di threadpool -> perlu lock
        self._lock = Lock()

    def save(self, note: Note) -> Note:
        with self._lock:
            if note.id is None:
                note.id = next(self._ids)
            # simpan copy: kalau caller ubah objek setelah save, data di "DB" nggak ikut berubah
            self._data[note.id] = deepcopy(note)
            return deepcopy(note)

    def get(self, note_id: int) -> Note | None:
        note = self._data.get(note_id)
        return deepcopy(note) if note else None

    def list_by_owner(self, owner: str, *, include_archived: bool = False) -> list[Note]:
        return [deepcopy(n) for n in self._data.values() if n.owner == owner and (include_archived or not n.archived)]

    def list_all(self) -> list[Note]:
        return [deepcopy(n) for n in self._data.values()]

    def delete(self, note_id: int) -> bool:
        with self._lock:
            return self._data.pop(note_id, None) is not None
