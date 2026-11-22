"""Multiple login: 4 cara autentikasi, semuanya cuma **fungsi** `Request -> User | None`.

Kalau dari Java: Spring punya `AuthenticationProvider` (interface) + satu class per
provider + `ProviderManager`. Di Python, "interface dengan 1 method" = callable.
Jadi tiap authenticator dibikin lewat *factory function* yang mengembalikan closure.
Dependency-nya (UserStore, TokenService) "diingat" closure, bukan disimpan di field.

    basic(users)          -> HTTP Basic
    api_key(users)        -> header X-API-Key
    bearer_jwt(users, tk) -> Authorization: Bearer <jwt>
    session(users)        -> cookie session
    first_match(a, b, c)  -> coba berurutan (kayak ProviderManager / filter chain)

Kontraknya:
    return User     -> berhasil
    return None     -> "bukan urusan saya" (header-nya nggak ada), lanjut ke berikutnya
    raise AuthError -> kredensial ADA tapi salah -> stop, langsung 401
"""

import base64
import binascii
from collections.abc import Callable

from starlette.requests import Request

from app.domain.models import User
from app.security.tokens import InvalidToken, TokenService
from app.security.users import UserStore

SESSION_KEY = "username"
API_KEY_HEADER = "X-API-Key"

type Authenticator = Callable[[Request], User | None]


class AuthError(Exception):
    def __init__(self, message: str, scheme: str) -> None:
        super().__init__(message)
        self.scheme = scheme  # dipakai untuk header WWW-Authenticate


def basic(users: UserStore) -> Authenticator:
    """HTTP Basic: `Authorization: Basic base64(user:pass)`. Stateless, kirim password tiap request.
    Wajib HTTPS. Cocok buat service-to-service sederhana / tooling internal."""

    def authenticate(request: Request) -> User | None:
        header = request.headers.get("Authorization", "")
        if not header.startswith("Basic "):
            return None
        try:
            decoded = base64.b64decode(header.removeprefix("Basic "), validate=True).decode()
        except binascii.Error, UnicodeDecodeError:  # 3.14: kurung boleh dihilangkan (PEP 758)
            raise AuthError("header basic rusak", "Basic") from None
        username, _, password = decoded.partition(":")
        if (user := users.authenticate(username, password)) is None:
            raise AuthError("username/password salah", "Basic")
        return user

    return authenticate


def api_key(users: UserStore) -> Authenticator:
    """API key di header `X-API-Key`. Biasanya untuk machine client / integrasi partner."""

    def authenticate(request: Request) -> User | None:
        if not (key := request.headers.get(API_KEY_HEADER)):
            return None
        if (user := users.find_by_api_key(key)) is None:
            raise AuthError("api key tidak valid", "ApiKey")
        return user

    return authenticate


def bearer_jwt(users: UserStore, tokens: TokenService) -> Authenticator:
    """Bearer JWT. Stateless: server nggak simpan apa-apa, semua info ada di token."""

    def authenticate(request: Request) -> User | None:
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        try:
            username, _roles = tokens.parse(header.removeprefix("Bearer "))
        except InvalidToken as e:
            raise AuthError(str(e), "Bearer") from None
        # Opsi: percaya roles dari token (full stateless) ATAU load ulang user (bisa deteksi
        # user yang sudah dihapus/di-ban). Di sini kita load ulang.
        if (user := users.find(username)) is None:
            raise AuthError("user sudah tidak ada", "Bearer")
        return user

    return authenticate


def session(users: UserStore) -> Authenticator:
    """Session cookie. Setara formLogin() + HttpSession.

    Starlette SessionMiddleware menyimpan session di cookie yang di-SIGN (client-side session).
    Kalau mau server-side (kayak Spring Session + Redis), simpan session id di cookie dan
    datanya di Redis/DB.
    """

    def authenticate(request: Request) -> User | None:
        if "session" not in request.scope:  # middleware belum dipasang
            return None
        if not (username := request.session.get(SESSION_KEY)):
            return None
        if (user := users.find(username)) is None:
            request.session.clear()
            raise AuthError("session tidak valid", "Session")
        return user

    return authenticate


def first_match(*authenticators: Authenticator) -> Authenticator:
    """Gabungkan beberapa authenticator: yang pertama mengembalikan User menang.
    Hasilnya juga Authenticator, jadi bisa digabung lagi (composite tanpa class)."""

    def authenticate(request: Request) -> User | None:
        return next((u for auth in authenticators if (u := auth(request)) is not None), None)

    return authenticate
