"""DTO (request/response) pakai Pydantic v2. Setara DTO + Bean Validation (@NotBlank, @Size).

Kenapa DTO dipisah dari domain? Supaya kontrak API nggak ikut berubah tiap domain
berubah, dan supaya field internal (password_hash, dll.) nggak bocor ke response.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    body: str = Field(default="", max_length=10_000)


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    body: str | None = Field(default=None, max_length=10_000)


class NoteOut(BaseModel):
    # from_attributes=True -> bisa dibuat dari object biasa (dataclass domain), bukan cuma dict
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    owner: str
    archived: bool
    created_at: datetime


class UserOut(BaseModel):
    username: str
    roles: list[str]
    auth_method: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginIn(BaseModel):
    username: str
    password: str
