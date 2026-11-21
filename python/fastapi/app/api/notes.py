"""CRUD notes. Bisa diakses pakai login jenis apa pun (CurrentUser = any_user)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import CurrentUser, NoteServiceDep, require_role
from app.api.schemas import NoteCreate, NoteOut, NoteUpdate
from app.domain.models import Note, Role, User

router = APIRouter(prefix="/notes", tags=["notes"])


# Endpoint `def` biasa (bukan async def) karena repo kita blocking I/O (sqlite3, file).
# FastAPI otomatis jalanin di threadpool. Kalau pakai driver async (asyncpg, aiosqlite),
# baru pakai `async def`. Salah campur = event loop ke-block. Ini pertanyaan interview favorit.
@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(body: NoteCreate, user: CurrentUser, svc: NoteServiceDep) -> Note:
    return svc.create(user, body.title, body.body)


@router.get("", response_model=list[NoteOut])
def list_my_notes(user: CurrentUser, svc: NoteServiceDep, include_archived: bool = False) -> list[Note]:
    return svc.list_mine(user, include_archived=include_archived)


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, user: CurrentUser, svc: NoteServiceDep) -> Note:
    return svc.get(user, note_id)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, body: NoteUpdate, user: CurrentUser, svc: NoteServiceDep) -> Note:
    return svc.update(user, note_id, title=body.title, body=body.body)


@router.post("/{note_id}/archive", response_model=NoteOut)
def archive_note(note_id: int, user: CurrentUser, svc: NoteServiceDep) -> Note:
    return svc.archive(user, note_id)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, user: CurrentUser, svc: NoteServiceDep) -> None:
    svc.delete(user, note_id)


admin = APIRouter(prefix="/admin", tags=["admin"])


@admin.get("/notes", response_model=list[NoteOut])
def all_notes(
    user: Annotated[User, Depends(require_role(Role.ADMIN))],
    svc: NoteServiceDep,
) -> list[Note]:
    return svc.list_all(user)
