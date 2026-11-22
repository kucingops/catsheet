"""Unit test murni domain: tanpa framework, tanpa DB, super cepat."""

import pytest

from app.domain.models import ArchivedNoteError, Note, Role, User

ALICE = User("alice", "x")
BOB = User("bob", "x")
ADMIN = User("root", "x", roles=frozenset({Role.USER, Role.ADMIN}))


def test_title_di_trim() -> None:
    assert Note(title="  halo ", body="", owner="alice").title == "halo"


@pytest.mark.parametrize("title", ["", "   ", "x" * 101])
def test_title_invalid(title: str) -> None:
    with pytest.raises(ValueError):
        Note(title=title, body="", owner="alice")


@pytest.mark.parametrize(("user", "allowed"), [(ALICE, True), (BOB, False), (ADMIN, True)])
def test_ownership_rule(user: User, allowed: bool) -> None:
    assert Note(title="t", body="", owner="alice").can_be_modified_by(user) is allowed


def test_edit_validasi_title_baru() -> None:
    note = Note(title="t", body="", owner="alice")
    with pytest.raises(ValueError):
        note.edit(title="  ")
    assert note.title == "t"  # state nggak berubah kalau validasi gagal


def test_archived_tidak_bisa_diedit() -> None:
    note = Note(title="t", body="", owner="alice")
    note.archive()
    with pytest.raises(ArchivedNoteError):
        note.edit(body="baru")


def test_user_immutable() -> None:
    with pytest.raises(AttributeError):
        ALICE.username = "hack"  # type: ignore[misc]
