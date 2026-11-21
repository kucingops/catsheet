"""Dependency FastAPI untuk security. Ini "filter chain"-nya.

Pakai `Security(...)` dengan scheme bawaan FastAPI (auto_error=False) supaya tombol
"Authorize" di Swagger UI (/docs) muncul, tapi logic sebenarnya di authenticators.py.

Dependency di FastAPI itu cuma fungsi. `Depends(f)` = "panggil f dulu, kasih hasilnya ke sini".
Dependency boleh punya dependency lagi, FastAPI yang nyusun grafnya (mirip @Autowired, tapi
eksplisit di signature).
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader, HTTPBasic, OAuth2PasswordBearer

from app.container import Container
from app.domain.models import Role, User
from app.persistence.base import NoteRepository
from app.security.authenticators import API_KEY_HEADER, Authenticator, AuthError

# Scheme ini cuma buat dokumentasi OpenAPI (tombol Authorize), validasinya di authenticators.py
BasicDoc = Annotated[object, Security(HTTPBasic(auto_error=False))]
ApiKeyDoc = Annotated[object, Security(APIKeyHeader(name=API_KEY_HEADER, auto_error=False))]
BearerDoc = Annotated[object, Security(OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False))]


def get_container(request: Request) -> Container:
    return request.app.state.container


ContainerDep = Annotated[Container, Depends(get_container)]


def get_repo(c: ContainerDep) -> NoteRepository:
    return c.repo


RepoDep = Annotated[NoteRepository, Depends(get_repo)]


def _run(authenticate: Authenticator, request: Request, scheme: str) -> User:
    try:
        user = authenticate(request)
    except AuthError as e:
        raise _unauthorized(str(e), e.scheme) from None
    if user is None:
        raise _unauthorized("butuh autentikasi", scheme)
    return user


def _unauthorized(detail: str, scheme: str) -> HTTPException:
    # Untuk Basic, header ini bikin browser munculin popup login
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": scheme})


# --- satu dependency per jenis login -----------------------------------------
def basic_user(request: Request, c: ContainerDep, _: BasicDoc) -> User:
    return _run(c.basic, request, "Basic")


def api_key_user(request: Request, c: ContainerDep, _: ApiKeyDoc) -> User:
    return _run(c.api_key, request, "ApiKey")


def jwt_user(request: Request, c: ContainerDep, _: BearerDoc) -> User:
    return _run(c.jwt, request, "Bearer")


def session_user(request: Request, c: ContainerDep) -> User:
    return _run(c.session, request, "Session")


def any_user(request: Request, c: ContainerDep, _b: BearerDoc, _k: ApiKeyDoc, _h: BasicDoc) -> User:
    return _run(c.any, request, "Bearer")


CurrentUser = Annotated[User, Depends(any_user)]


# --- authorization (role) ----------------------------------------------------
def require_role(role: Role) -> Callable[..., User]:
    """Dependency factory (closure lagi). Setara @PreAuthorize("hasRole('ADMIN')").

    401 = belum login / kredensial salah (authentication)
    403 = sudah login tapi nggak punya hak (authorization)
    """

    def checker(user: CurrentUser) -> User:
        if not user.has_role(role):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"butuh role {role}")
        return user

    return checker
