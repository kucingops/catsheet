"""Contract test: test yang SAMA dijalankan ke 4 implementasi repository
(lihat fixture `any_repo` di conftest.py). Kalau satu implementasi beda perilaku,
langsung ketahuan. Ini cara praktis membuktikan Liskov Substitution Principle.
"""

from app.domain.models import Note
from app.persistence.base import NoteRepository


def _note(owner: str = "alice", title: str = "t") -> Note:
    return Note(title=title, body="isi", owner=owner)


def test_save_generate_id(any_repo: NoteRepository) -> None:
    a = any_repo.save(_note())
    b = any_repo.save(_note())
    assert a.id is not None and b.id is not None and a.id != b.id


def test_get_roundtrip(any_repo: NoteRepository) -> None:
    saved = any_repo.save(_note(title="halo"))
    loaded = any_repo.get(saved.id)
    assert loaded is not None
    assert (loaded.title, loaded.body, loaded.owner, loaded.archived) == ("halo", "isi", "alice", False)
    assert loaded.created_at == saved.created_at


def test_get_tidak_ada(any_repo: NoteRepository) -> None:
    assert any_repo.get(12345) is None


def test_update(any_repo: NoteRepository) -> None:
    note = any_repo.save(_note())
    note.edit(title="baru")
    note.archive()
    any_repo.save(note)
    loaded = any_repo.get(note.id)
    assert loaded.title == "baru" and loaded.archived is True


def test_list_by_owner_filter_archived(any_repo: NoteRepository) -> None:
    any_repo.save(_note("alice", "a1"))
    archived = _note("alice", "a2")
    archived.archive()
    any_repo.save(archived)
    any_repo.save(_note("bob", "b1"))

    assert [n.title for n in any_repo.list_by_owner("alice")] == ["a1"]
    assert {n.title for n in any_repo.list_by_owner("alice", include_archived=True)} == {"a1", "a2"}
    assert len(any_repo.list_all()) == 3


def test_delete(any_repo: NoteRepository) -> None:
    note = any_repo.save(_note())
    assert any_repo.delete(note.id) is True
    assert any_repo.get(note.id) is None
    assert any_repo.delete(note.id) is False


def test_mutasi_objek_setelah_save_tidak_bocor(any_repo: NoteRepository) -> None:
    """Objek yang dikembalikan repo itu copy/detached; ubah tanpa save != tersimpan."""
    note = any_repo.save(_note(title="asli"))
    note.title = "diubah tanpa save"
    assert any_repo.get(note.id).title == "asli"


def test_implementasi_nggak_inherit_protocol(any_repo: NoteRepository) -> None:
    """Structural typing: cocok karena bentuknya sama, bukan karena `extends`/`implements`."""
    assert type(any_repo).__mro__ == (type(any_repo), object)
