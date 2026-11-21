"""Multiple login: 4 cara autentikasi, satu kontrak (Strategy + Chain of Responsibility).

Analogi Spring Security:
    Authenticator          -> AuthenticationProvider / AuthenticationFilter
    CompositeAuthenticator -> ProviderManager (coba provider satu per satu)
    dependency per router  -> beberapa SecurityFilterChain dengan securityMatcher beda

Kontraknya:
    return User   -> berhasil
    return None   -> "bukan urusan saya" (header-nya nggak ada), lanjut ke berikutnya
    raise AuthError -> kredensial ADA tapi salah -> stop, langsung 401
"""

import base64
import binascii
from abc import ABC, abstractmethod

from starlette.requests import Request

from app.domain.models import User
from app.security.tokens import InvalidToken, TokenService
from app.security.users import UserStore

SESSION_KEY = "username"


class AuthError(Exception):
    def __init__(self, message: str, scheme: str) -> None:
        super().__init__(message)
        self.scheme = scheme  # dipakai untuk header WWW-Authenticate


class Authenticator(ABC):
    scheme: str  # class attribute, wajib diisi subclass

    def __init__(self, users: UserStore) -> None:
        self._users = users

    @abstractmethod
    def authenticate(self, request: Request) -> User | None: ...

    def _fail(self, message: str) -> AuthError:
        return AuthError(message, self.scheme)


class BasicAuthenticator(Authenticator):
    """HTTP Basic: `Authorization: Basic base64(user:pass)`. Stateless, kirim password tiap request.
    Wajib HTTPS. Cocok buat service-to-service sederhana / tooling internal."""

    scheme = "Basic"

    def authenticate(self, request: Request) -> User | None:
        header = request.headers.get("Authorization", "")
        if not header.startswith("Basic "):
            return None
        try:
            decoded = base64.b64decode(header.removeprefix("Basic "), validate=True).decode()
            username, _, password = decoded.partition(":")
        except binascii.Error, UnicodeDecodeError:
            raise self._fail("header basic rusak") from None
        user = self._users.authenticate(username, password)
        if user is None:
            raise self._fail("username/password salah")
        return user


class ApiKeyAuthenticator(Authenticator):
    """API key di header `X-API-Key`. Biasanya untuk machine client / integrasi partner."""

    scheme = "ApiKey"
    header_name = "X-API-Key"

    def authenticate(self, request: Request) -> User | None:
        key = request.headers.get(self.header_name)
        if not key:
            return None
        user = self._users.find_by_api_key(key)
        if user is None:
            raise self._fail("api key tidak valid")
        return user


class JwtAuthenticator(Authenticator):
    """Bearer JWT. Stateless: server nggak simpan apa-apa, semua info ada di token."""

    scheme = "Bearer"

    def __init__(self, users: UserStore, tokens: TokenService) -> None:
        super().__init__(users)
        self._tokens = tokens

    def authenticate(self, request: Request) -> User | None:
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        try:
            username, _roles = self._tokens.parse(header.removeprefix("Bearer "))
        except InvalidToken as e:
            raise self._fail(str(e)) from None
        # Opsi: percaya roles dari token (full stateless) ATAU load ulang user (bisa deteksi
        # user yang sudah dihapus/di-ban). Di sini kita load ulang.
        user = self._users.find(username)
        if user is None:
            raise self._fail("user sudah tidak ada")
        return user


class SessionAuthenticator(Authenticator):
    """Session cookie (stateful dari sisi konsep). Setara formLogin() + HttpSession.

    Starlette SessionMiddleware menyimpan session di cookie yang di-SIGN (client-side session).
    Kalau mau server-side (kayak Spring Session + Redis), simpan session id di cookie dan
    datanya di Redis/DB.
    """

    scheme = "Session"

    def authenticate(self, request: Request) -> User | None:
        if "session" not in request.scope:  # middleware belum dipasang
            return None
        username = request.session.get(SESSION_KEY)
        if not username:
            return None
        user = self._users.find(username)
        if user is None:
            request.session.clear()
            raise self._fail("session tidak valid")
        return user


class CompositeAuthenticator(Authenticator):
    """Coba beberapa authenticator berurutan. Composite pattern: dia sendiri juga Authenticator."""

    scheme = "Composite"

    def __init__(self, *delegates: Authenticator) -> None:
        self._delegates = delegates

    def authenticate(self, request: Request) -> User | None:
        for delegate in self._delegates:
            if (user := delegate.authenticate(request)) is not None:
                return user
        return None
