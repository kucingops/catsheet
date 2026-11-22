"""Fixture bersama. pytest otomatis load conftest.py (nggak perlu import).

Scope fixture:  function (default, tiap test baru) | module | session (sekali per run)
Mirip @BeforeEach vs @BeforeAll di JUnit.
"""

import base64
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.persistence.base import NoteRepository
from app.persistence.json_file import JsonFileNoteRepository
from app.persistence.memory import InMemoryNoteRepository
from app.persistence.sqlalchemy_repo import SqlAlchemyNoteRepository
from app.persistence.sqlite_raw import SqliteNoteRepository
from app.settings import Settings

REPO_FACTORIES = {
    "memory": lambda tmp: InMemoryNoteRepository(),
    "json": lambda tmp: JsonFileNoteRepository(tmp / "notes.json"),
    "sqlite": lambda tmp: SqliteNoteRepository(":memory:"),
    "sqlalchemy": lambda tmp: SqlAlchemyNoteRepository("sqlite+pysqlite:///:memory:"),
}


@pytest.fixture(params=list(REPO_FACTORIES))
def any_repo(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[NoteRepository]:
    """Fixture ber-parameter: SETIAP test yang pakai fixture ini jalan 4x, sekali per storage.
    Ini "contract test": semua implementasi harus lulus test yang sama (cek LSP)."""
    repo = REPO_FACTORIES[request.param](tmp_path)
    yield repo  # kode setelah yield = teardown (@AfterEach)
    repo.close()


@pytest.fixture
def settings() -> Settings:
    return Settings(jwt_secret="test-secret-yang-cukup-panjang-32-byte!!", session_secret="test")


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app(settings, repo=InMemoryNoteRepository())
    with TestClient(app) as c:  # `with` -> jalanin lifespan startup/shutdown
        yield c


def basic(username: str, password: str) -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def bearer(client: TestClient, username: str, password: str) -> dict[str, str]:
    r = client.post("/auth/token", data={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
