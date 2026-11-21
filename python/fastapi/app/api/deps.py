"""Dependency FastAPI untuk security. Ini "filter chain"-nya.

Pakai `Security(...)` dengan scheme bawaan FastAPI (auto_error=False) supaya tombol
"Authorize" di Swagger UI (/docs) muncul, tapi logic sebenarnya di authenticators.py.
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader, HTTPBasic, OAuth2PasswordBearer

from app.container import Container
from app.domain.models import Role, User
from app.security.authenticators import Authenticator, AuthError
from app.services.note_service import NoteService

basic_scheme = HTTPBasic(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def get_container(request: Request) -> Container:
    return request.app.state.container


ContainerDep = Annotated[Container, Depends(get_container)]


def get_note_service(c: ContainerDep) -> NoteService:
    return c.notes


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]


def _run(authenticator: Authenticator, request: Request) -> User:
    try:
        user = authenticator.authenticate(request)
    except AuthError as e:
        raise _unauthorized(str(e), e.scheme) from None
    if user is None:
        raise _unauthorized("butuh autentikasi", authenticator.scheme)
    return user


def _unauthorized(detail: str, scheme: str) -> HTTPException:
    # Untuk Basic, header ini bikin browser munculin popup login
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": scheme if scheme != "Composite" else "Bearer"},
    )


# --- satu dependency per jenis login -----------------------------------------
def basic_user(request: Request, c: ContainerDep, _=Security(basic_scheme)) -> User:
    return _run(c.basic, request)


def api_key_user(request: Request, c: ContainerDep, _=Security(api_key_scheme)) -> User:
    return _run(c.api_key, request)


def jwt_user(request: Request, c: ContainerDep, _=Security(bearer_scheme)) -> User:
    return _run(c.jwt, request)


def session_user(request: Request, c: ContainerDep) -> User:
    return _run(c.session, request)


def any_user(
    request: Request,
    c: ContainerDep,
    _b=Security(bearer_scheme),
    _k=Security(api_key_scheme),
    _h=Security(basic_scheme),
) -> User:
    return _run(c.any, request)


CurrentUser = Annotated[User, Depends(any_user)]


# --- authorization (role) ----------------------------------------------------
def require_role(role: Role) -> Callable[..., User]:
    """Dependency factory. Setara @PreAuthorize("hasRole('ADMIN')").

    401 = belum login / kredensial salah (authentication)
    403 = sudah login tapi nggak punya hak (authorization)
    """

    def checker(user: CurrentUser) -> User:
        if not user.has_role(role):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"butuh role {role}")
        return user

    return checker
