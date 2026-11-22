"""Composition root: tempat semua dependency dirakit sekali (manual DI).

FastAPI nggak punya IoC container kayak Spring ApplicationContext. `Depends()` itu
DI per-request. Untuk yang sifatnya singleton (repo, user store, authenticator) kita
rakit sekali di `build_container()`, simpan di `app.state`, lalu diambil lewat
dependency di api/deps.py.

`Container` cuma dataclass (record berisi dependency), nggak punya behavior.
"""

from dataclasses import dataclass
from datetime import timedelta

from app.persistence.base import NoteRepository
from app.persistence.factory import build_note_repository
from app.security import authenticators as auth
from app.security.tokens import TokenService
from app.security.users import UserStore, seeded_user_store
from app.settings import Settings


@dataclass(frozen=True, slots=True)
class Container:
    settings: Settings
    users: UserStore
    tokens: TokenService
    repo: NoteRepository
    basic: auth.Authenticator
    api_key: auth.Authenticator
    jwt: auth.Authenticator
    session: auth.Authenticator
    any: auth.Authenticator


def build_container(settings: Settings, *, repo: NoteRepository | None = None) -> Container:
    users = seeded_user_store()
    tokens = TokenService(
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        ttl=timedelta(minutes=settings.jwt_ttl_minutes),
    )
    basic, api_key = auth.basic(users), auth.api_key(users)
    jwt, session = auth.bearer_jwt(users, tokens), auth.session(users)
    return Container(
        settings=settings,
        users=users,
        tokens=tokens,
        repo=repo or build_note_repository(settings),
        basic=basic,
        api_key=api_key,
        jwt=jwt,
        session=session,
        # urutan = prioritas, kayak urutan filter di Spring Security
        any=auth.first_match(jwt, api_key, session, basic),
    )
