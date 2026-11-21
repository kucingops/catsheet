"""Integration test lewat HTTP pakai TestClient (httpx di bawahnya).
Setara @SpringBootTest + MockMvc / WebTestClient."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings
from tests.conftest import REPO_FACTORIES, basic, bearer


# ---------------- multiple login ----------------
def test_login_basic(client: TestClient) -> None:
    r = client.get("/whoami/basic", headers=basic("alice", "alice123"))
    assert r.status_code == 200
    assert r.json() == {"username": "alice", "roles": ["user"], "auth_method": "basic"}


def test_basic_salah_dapat_www_authenticate(client: TestClient) -> None:
    r = client.get("/whoami/basic", headers=basic("alice", "salah"))
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Basic"


def test_login_api_key(client: TestClient) -> None:
    r = client.get("/whoami/api-key", headers={"X-API-Key": "admin-api-key"})
    assert r.json()["username"] == "admin"
    assert client.get("/whoami/api-key", headers={"X-API-Key": "ngawur"}).status_code == 401


def test_login_jwt(client: TestClient) -> None:
    r = client.get("/whoami/jwt", headers=bearer(client, "bob", "bob123"))
    assert r.json()["username"] == "bob"


def test_token_password_salah(client: TestClient) -> None:
    r = client.post("/auth/token", data={"username": "bob", "password": "x"})
    assert r.status_code == 401


def test_login_session_flow(client: TestClient) -> None:
    assert client.get("/whoami/session").status_code == 401
    r = client.post("/auth/session/login", json={"username": "alice", "password": "alice123"})
    assert r.status_code == 200
    assert "session" in r.cookies  # TestClient nyimpan cookie otomatis kayak browser
    assert client.get("/whoami/session").json()["username"] == "alice"
    assert client.post("/auth/session/logout").status_code == 204
    assert client.get("/whoami/session").status_code == 401


def test_endpoint_khusus_tidak_terima_login_lain(client: TestClient) -> None:
    """/whoami/jwt cuma terima JWT, Basic dianggap belum login."""
    assert client.get("/whoami/jwt", headers=basic("alice", "alice123")).status_code == 401


@pytest.mark.parametrize(
    "auth",
    [
        lambda c: basic("alice", "alice123"),
        lambda c: {"X-API-Key": "alice-api-key"},
        lambda c: bearer(c, "alice", "alice123"),
    ],
    ids=["basic", "api-key", "jwt"],
)
def test_any_terima_semua_jenis_login(client: TestClient, auth) -> None:
    assert client.get("/whoami/any", headers=auth(client)).json()["username"] == "alice"


# ---------------- authorization ----------------
def test_401_vs_403(client: TestClient) -> None:
    assert client.get("/admin/notes").status_code == 401  # belum login
    assert client.get("/admin/notes", headers=basic("alice", "alice123")).status_code == 403  # bukan admin
    assert client.get("/admin/notes", headers=basic("admin", "admin123")).status_code == 200


# ---------------- notes CRUD ----------------
ALICE = basic("alice", "alice123")
BOB = basic("bob", "bob123")


def test_crud_notes(client: TestClient) -> None:
    r = client.post("/notes", json={"title": "Belajar FastAPI", "body": "Depends()"}, headers=ALICE)
    assert r.status_code == 201
    note_id = r.json()["id"]

    assert client.get(f"/notes/{note_id}", headers=ALICE).json()["title"] == "Belajar FastAPI"
    r = client.patch(f"/notes/{note_id}", json={"body": "Security()"}, headers=ALICE)
    assert r.json()["body"] == "Security()"
    assert [n["id"] for n in client.get("/notes", headers=ALICE).json()] == [note_id]
    assert client.delete(f"/notes/{note_id}", headers=ALICE).status_code == 204
    assert client.get(f"/notes/{note_id}", headers=ALICE).status_code == 404


def test_validasi_request(client: TestClient) -> None:
    r = client.post("/notes", json={"title": ""}, headers=ALICE)
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"] == ["body", "title"]


def test_whitespace_title_ditolak_domain(client: TestClient) -> None:
    """Lolos Pydantic (min_length=1) tapi ditolak domain (__post_init__) -> handler ValueError."""
    assert client.post("/notes", json={"title": "   "}, headers=ALICE).status_code == 422


def test_bob_tidak_bisa_lihat_note_alice(client: TestClient) -> None:
    note_id = client.post("/notes", json={"title": "rahasia"}, headers=ALICE).json()["id"]
    assert client.get(f"/notes/{note_id}", headers=BOB).status_code == 404
    assert client.delete(f"/notes/{note_id}", headers=BOB).status_code == 404
    assert client.get("/notes", headers=BOB).json() == []


def test_edit_note_archived_409(client: TestClient) -> None:
    note_id = client.post("/notes", json={"title": "x"}, headers=ALICE).json()["id"]
    client.post(f"/notes/{note_id}/archive", headers=ALICE)
    assert client.patch(f"/notes/{note_id}", json={"body": "y"}, headers=ALICE).status_code == 409


@pytest.mark.parametrize("storage", list(REPO_FACTORIES))
def test_end_to_end_semua_storage(storage: str, settings: Settings, tmp_path) -> None:
    """App yang sama, storage beda, hasil sama. Pembuktian Dependency Inversion."""
    app = create_app(settings, repo=REPO_FACTORIES[storage](tmp_path))
    with TestClient(app) as c:
        note_id = c.post("/notes", json={"title": storage}, headers=ALICE).json()["id"]
        assert c.get(f"/notes/{note_id}", headers=ALICE).json()["title"] == storage
        assert len(c.get("/admin/notes", headers=basic("admin", "admin123")).json()) == 1


def test_storage_dipilih_dari_env(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """monkeypatch = ubah env/atribut sementara, otomatis di-restore setelah test."""
    monkeypatch.setenv("APP_STORAGE", "json")
    monkeypatch.setenv("APP_JSON_PATH", str(tmp_path / "x.json"))
    with TestClient(create_app()) as c:
        c.post("/notes", json={"title": "persist"}, headers=ALICE)
    assert "persist" in (tmp_path / "x.json").read_text()
