"""Service layer: business rule + authorization level objek (ownership).

Bergantung ke `NoteRepository` (abstraksi), bukan ke implementasi tertentu
-> Dependency Inversion. Unit test-nya cukup pakai repo in-memory atau Mock.
"""

from app.domain.models import Note, NoteNotFound, NotOwner, Role, User
from app.persistence.base import NoteRepository


class NoteService:
    def __init__(self, repo: NoteRepository) -> None:
        self._repo = repo

    def create(self, user: User, title: str, body: str) -> Note:
        return self._repo.save(Note(title=title, body=body, owner=user.username))

    def list_mine(self, user: User, *, include_archived: bool = False) -> list[Note]:
        return self._repo.list_by_owner(user.username, include_archived=include_archived)

    def list_all(self, user: User) -> list[Note]:
        if not user.has_role(Role.ADMIN):
            raise NotOwner("hanya admin yang boleh lihat semua note")
        return self._repo.list_all()

    def get(self, user: User, note_id: int) -> Note:
        note = self._repo.get(note_id)
        if note is None:
            raise NoteNotFound(note_id)
        if not note.can_be_modified_by(user):
            # sengaja 404, bukan 403: jangan bocorkan bahwa note milik orang lain itu ada
            raise NoteNotFound(note_id)
        return note

    def update(self, user: User, note_id: int, *, title: str | None, body: str | None) -> Note:
        note = self.get(user, note_id)
        note.edit(title=title, body=body)
        return self._repo.save(note)

    def archive(self, user: User, note_id: int) -> Note:
        note = self.get(user, note_id)
        note.archive()
        return self._repo.save(note)

    def delete(self, user: User, note_id: int) -> None:
        self.get(user, note_id)  # cek exist + ownership
        self._repo.delete(note_id)
