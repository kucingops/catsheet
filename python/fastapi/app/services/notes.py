"""Service layer: business rule + authorization level objek (ownership).

Kalau dari Java: biasanya ini `@Service class NoteService` dengan repository di-inject
lewat constructor. Di Python cukup **fungsi di module**: repository dikirim sebagai
argumen pertama. Nggak ada state yang perlu disimpan, jadi class cuma nambah upacara.
Module `notes` itu sendiri sudah jadi namespace-nya (`notes.create(...)`).

Fungsinya bergantung ke `NoteRepository` (Protocol), bukan ke implementasi tertentu
-> Dependency Inversion tetap jalan. Unit test cukup kirim repo in-memory atau Mock.
"""

from app.domain.models import Note, NoteNotFound, NotOwner, Role, User
from app.persistence.base import NoteRepository


def create(repo: NoteRepository, user: User, title: str, body: str) -> Note:
    return repo.save(Note(title=title, body=body, owner=user.username))


def list_mine(repo: NoteRepository, user: User, *, include_archived: bool = False) -> list[Note]:
    return repo.list_by_owner(user.username, include_archived=include_archived)


def list_all(repo: NoteRepository, user: User) -> list[Note]:
    if not user.has_role(Role.ADMIN):
        raise NotOwner("hanya admin yang boleh lihat semua note")
    return repo.list_all()


def get(repo: NoteRepository, user: User, note_id: int) -> Note:
    note = repo.get(note_id)
    if note is None or not note.can_be_modified_by(user):
        # sengaja 404 juga untuk note orang lain: jangan bocorkan bahwa note itu ada
        raise NoteNotFound(note_id)
    return note


def update(repo: NoteRepository, user: User, note_id: int, *, title: str | None, body: str | None) -> Note:
    note = get(repo, user, note_id)
    note.edit(title=title, body=body)
    return repo.save(note)


def archive(repo: NoteRepository, user: User, note_id: int) -> Note:
    note = get(repo, user, note_id)
    note.archive()
    return repo.save(note)


def delete(repo: NoteRepository, user: User, note_id: int) -> None:
    get(repo, user, note_id)  # cek exist + ownership
    repo.delete(note_id)
