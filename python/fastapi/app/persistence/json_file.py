"""Persistence tanpa database: serialisasi ke file JSON.

Poin interview:
- Tulis atomik: tulis ke file sementara lalu `os.replace` (atomic rename),
  biar file nggak korup kalau proses mati di tengah jalan.
- Nggak ada transaksi/locking antar proses -> nggak cocok buat multi-instance.
"""

import json
import os
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from threading import Lock

from app.domain.models import Note


class JsonFileNoteRepository:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = Lock()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._write({"next_id": 1, "notes": {}})

    # --- serialisasi (mapping domain <-> dict) ---
    @staticmethod
    def _to_dict(note: Note) -> dict:
        d = asdict(note)
        d["created_at"] = note.created_at.isoformat()
        return d

    @staticmethod
    def _from_dict(d: dict) -> Note:
        return Note(**{**d, "created_at": datetime.fromisoformat(d["created_at"])})

    def _read(self) -> dict:
        return json.loads(self._path.read_text(encoding="utf-8"))

    def _write(self, data: dict) -> None:
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, self._path)

    # --- implementasi kontrak ---
    def save(self, note: Note) -> Note:
        with self._lock:
            data = self._read()
            if note.id is None:
                note.id = data["next_id"]
                data["next_id"] += 1
            data["notes"][str(note.id)] = self._to_dict(note)  # key JSON selalu string
            self._write(data)
            return self._from_dict(data["notes"][str(note.id)])

    def get(self, note_id: int) -> Note | None:
        raw = self._read()["notes"].get(str(note_id))
        return self._from_dict(raw) if raw else None

    def list_by_owner(self, owner: str, *, include_archived: bool = False) -> list[Note]:
        return [n for n in self.list_all() if n.owner == owner and (include_archived or not n.archived)]

    def list_all(self) -> list[Note]:
        return [self._from_dict(d) for d in self._read()["notes"].values()]

    def delete(self, note_id: int) -> bool:
        with self._lock:
            data = self._read()
            removed = data["notes"].pop(str(note_id), None) is not None
            if removed:
                self._write(data)
            return removed

    def close(self) -> None:
        pass  # file dibuka-tutup per operasi, nggak ada handle yang nyangkut
