"""Unit test komponen security tanpa HTTP server."""

import base64
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from starlette.requests import Request

from app.domain.models import Role
from app.security import authenticators as auth
from app.security.authenticators import AuthError
from app.security.passwords import hash_password, verify_password
from app.security.tokens import InvalidToken, TokenService
from app.security.users import UserStore, seeded_user_store

SECRET = "unit-test-secret-yang-panjang-32-byte!!"


@pytest.fixture(scope="module")  # hashing argon2 lumayan lambat -> bikin sekali per module
def users() -> UserStore:
    return seeded_user_store()


@pytest.fixture
def tokens() -> TokenService:
    return TokenService(secret=SECRET, ttl=timedelta(minutes=5))


def make_request(headers: dict[str, str]) -> Request:
    """Bikin Request Starlette palsu dari ASGI scope (tanpa server)."""
    raw = [(k.lower().encode(), v.encode()) for k, v in headers.items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw})


# ---------------- password ----------------
def test_hash_password_bersalt() -> None:
    h1, h2 = hash_password("rahasia"), hash_password("rahasia")
    assert h1 != h2  # salt random
    assert h1.startswith("$argon2id$")
    assert verify_password("rahasia", h1) and not verify_password("salah", h1)


@pytest.mark.parametrize(
    ("username", "password", "ok"),
    [("alice", "alice123", True), ("alice", "salah", False), ("ghost", "x", False)],
)
def test_user_store_authenticate(users: UserStore, username: str, password: str, ok: bool) -> None:
    assert (users.authenticate(username, password) is not None) is ok


def test_api_key_disimpan_sebagai_hash(users: UserStore) -> None:
    alice = users.find("alice")
    assert alice.api_key != "alice-api-key" and len(alice.api_key) == 64
    assert users.find_by_api_key("alice-api-key") == alice


# ---------------- JWT ----------------
def test_jwt_roundtrip(users: UserStore, tokens: TokenService) -> None:
    username, roles = tokens.parse(tokens.issue(users.find("admin")))
    assert username == "admin" and Role.ADMIN in roles


def test_jwt_expired(users: UserStore, tokens: TokenService) -> None:
    old = datetime.now(UTC) - timedelta(hours=1)  # inject waktu -> nggak perlu sleep
    with pytest.raises(InvalidToken, match="expired"):
        tokens.parse(tokens.issue(users.find("alice"), now=old))


def test_jwt_secret_beda_ditolak(users: UserStore, tokens: TokenService) -> None:
    forged = TokenService(secret="secret-lain-yang-juga-panjang-32-byte!!").issue(users.find("alice"))
    with pytest.raises(InvalidToken):
        tokens.parse(forged)


def test_jwt_alg_none_ditolak(tokens: TokenService) -> None:
    unsigned = jwt.encode(
        {"sub": "admin", "roles": ["admin"], "iss": tokens.issuer, "exp": datetime.now(UTC) + timedelta(minutes=1)},
        key=None,
        algorithm="none",
    )
    with pytest.raises(InvalidToken):
        tokens.parse(unsigned)


def test_jwt_payload_bisa_dibaca_siapa_saja(users: UserStore, tokens: TokenService) -> None:
    """Bukti JWT bukan enkripsi: decode tanpa verifikasi tetap kebaca."""
    claims = jwt.decode(tokens.issue(users.find("alice")), options={"verify_signature": False})
    assert claims["sub"] == "alice"


# ---------------- authenticators (cuma fungsi, jadi tinggal dipanggil) ----------------
def _basic(u: str, p: str) -> dict[str, str]:
    return {"Authorization": "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()}


def test_basic_tanpa_header_return_none(users: UserStore) -> None:
    assert auth.basic(users)(make_request({})) is None


def test_basic_salah_raise(users: UserStore) -> None:
    with pytest.raises(AuthError) as exc:
        auth.basic(users)(make_request(_basic("alice", "x")))
    assert exc.value.scheme == "Basic"


def test_basic_header_rusak(users: UserStore) -> None:
    with pytest.raises(AuthError, match="rusak"):
        auth.basic(users)(make_request({"Authorization": "Basic !!!"}))


def test_composite_ambil_yang_cocok(users: UserStore, tokens: TokenService) -> None:
    chain = auth.first_match(auth.bearer_jwt(users, tokens), auth.api_key(users), auth.basic(users))
    assert chain(make_request({"X-API-Key": "admin-api-key"})).username == "admin"
    assert chain(make_request(_basic("bob", "bob123"))).username == "bob"
    assert chain(make_request({})) is None


def test_composite_stop_di_kredensial_salah(users: UserStore, tokens: TokenService) -> None:
    """Kredensial salah harus 401, JANGAN fallback ke authenticator berikutnya."""
    chain = auth.first_match(auth.api_key(users), auth.basic(users))
    with pytest.raises(AuthError):
        chain(make_request({"X-API-Key": "salah", **_basic("bob", "bob123")}))


def test_authenticator_bisa_diganti_lambda(users: UserStore) -> None:
    """Karena kontraknya cuma `Request -> User | None`, test double cukup lambda."""
    bob = users.find("bob")
    chain = auth.first_match(lambda _: None, lambda _: bob, auth.basic(users))
    assert chain(make_request({})) is bob
