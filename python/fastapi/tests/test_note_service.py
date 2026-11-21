"""Unit test service. Dua gaya test double:

1. Mock (unittest.mock) -> verifikasi INTERAKSI ("save dipanggil 1x dengan X").
   Mirip Mockito: when(...).thenReturn(...) / verify(...).
2. Fake (implementasi ringan beneran, di sini InMemoryNoteRepository) -> verifikasi STATE.
   Biasanya lebih tahan refactor dibanding mock.
"""

from unittest.mock import Mock, create_autospec

import pytest

from app.domain.models import ArchivedNoteError, Note, NoteNotFound, NotOwner, Role, User
from app.persistence.base import NoteRepository
from app.persistence.memory import InMemoryNoteRepository
from app.services.note_service import NoteService

ALICE = User("alice", "x")
BOB = User("bob", "x")
ADMIN = User("root", "x", roles=frozenset({Role.USER, Role.ADMIN}))


# ---------------- gaya Mock ----------------
@pytest.fixture
def repo_mock() -> Mock:
    # create_autospec: mock yang ikut signature asli -> salah argumen langsung error
    return create_autospec(NoteRepository, instance=True)


def test_create_set_owner_dari_user_login(repo_mock: Mock) -> None:
    repo_mock.save.side_effect = lambda n: n  # thenAnswer(inv -> inv.getArgument(0))
    note = NoteService(repo_mock).create(ALICE, "judul", "isi")

    repo_mock.save.assert_called_once()
    saved: Note = repo_mock.save.call_args.args[0]  # ArgumentCaptor
    assert saved.owner == "alice"
    assert note.title == "judul"


def test_get_not_found(repo_mock: Mock) -> None:
    repo_mock.get.return_value = None
    with pytest.raises(NoteNotFound):
        NoteService(repo_mock).get(ALICE, 99)


def test_note_orang_lain_dianggap_404(repo_mock: Mock) -> None:
    repo_mock.get.return_value = Note(id=1, title="t", body="", owner="alice")
    with pytest.raises(NoteNotFound):
        NoteService(repo_mock).get(BOB, 1)


def test_delete_tidak_dipanggil_kalau_bukan_owner(repo_mock: Mock) -> None:
    repo_mock.get.return_value = Note(id=1, title="t", body="", owner="alice")
    with pytest.raises(NoteNotFound):
        NoteService(repo_mock).delete(BOB, 1)
    repo_mock.delete.assert_not_called()  # verify(repo, never()).delete(...)


# ---------------- gaya Fake ----------------
@pytest.fixture
def service() -> NoteService:
    return NoteService(InMemoryNoteRepository())


def test_list_mine_hanya_note_sendiri(service: NoteService) -> None:
    service.create(ALICE, "a1", "")
    service.create(BOB, "b1", "")
    assert [n.title for n in service.list_mine(ALICE)] == ["a1"]


def test_admin_boleh_edit_note_orang_lain(service: NoteService) -> None:
    note = service.create(ALICE, "a1", "")
    assert service.update(ADMIN, note.id, title="diubah admin", body=None).title == "diubah admin"


def test_list_all_hanya_admin(service: NoteService) -> None:
    service.create(ALICE, "a1", "")
    assert len(service.list_all(ADMIN)) == 1
    with pytest.raises(NotOwner):
        service.list_all(ALICE)


def test_archive_flow(service: NoteService) -> None:
    note = service.create(ALICE, "a1", "")
    service.archive(ALICE, note.id)
    assert service.list_mine(ALICE) == []
    assert len(service.list_mine(ALICE, include_archived=True)) == 1
    with pytest.raises(ArchivedNoteError):
        service.update(ALICE, note.id, title=None, body="x")
