"""Endpoint login: tukar username/password jadi JWT, atau jadi session cookie.

Lalu /whoami/* untuk mencoba tiap jenis login secara terpisah.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import (
    ContainerDep,
    any_user,
    api_key_user,
    basic_user,
    jwt_user,
    session_user,
)
from app.api.schemas import LoginIn, TokenOut, UserOut
from app.domain.models import User
from app.security.authenticators import SESSION_KEY

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenOut)
def issue_token(form: Annotated[OAuth2PasswordRequestForm, Depends()], c: ContainerDep) -> TokenOut:
    """OAuth2 "password grant" (form-urlencoded) -> dipakai tombol Authorize di Swagger UI."""
    user = c.users.authenticate(form.username, form.password)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="username/password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=c.tokens.issue(user), expires_in=int(c.tokens.ttl.total_seconds()))


@router.post("/session/login", response_model=UserOut)
def session_login(body: LoginIn, request: Request, c: ContainerDep) -> UserOut:
    user = c.users.authenticate(body.username, body.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="username/password salah")
    # Best practice: regenerate session id setelah login (cegah session fixation).
    # Session Starlette berbasis cookie ter-sign, jadi clear() + isi ulang sudah cukup.
    request.session.clear()
    request.session[SESSION_KEY] = user.username
    return _out(user, "session")


@router.post("/session/logout", status_code=status.HTTP_204_NO_CONTENT)
def session_logout(request: Request) -> None:
    request.session.clear()


whoami = APIRouter(prefix="/whoami", tags=["whoami"])


def _out(user: User, method: str) -> UserOut:
    return UserOut(username=user.username, roles=sorted(user.roles), auth_method=method)


@whoami.get("/basic", response_model=UserOut)
def whoami_basic(user: Annotated[User, Depends(basic_user)]) -> UserOut:
    return _out(user, "basic")


@whoami.get("/api-key", response_model=UserOut)
def whoami_api_key(user: Annotated[User, Depends(api_key_user)]) -> UserOut:
    return _out(user, "api-key")


@whoami.get("/jwt", response_model=UserOut)
def whoami_jwt(user: Annotated[User, Depends(jwt_user)]) -> UserOut:
    return _out(user, "jwt")


@whoami.get("/session", response_model=UserOut)
def whoami_session(user: Annotated[User, Depends(session_user)]) -> UserOut:
    return _out(user, "session")


@whoami.get("/any", response_model=UserOut)
def whoami_any(user: Annotated[User, Depends(any_user)]) -> UserOut:
    return _out(user, "any")
