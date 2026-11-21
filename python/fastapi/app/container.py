"""Composition root: tempat semua object dirakit (manual DI).

FastAPI nggak punya IoC container kayak Spring ApplicationContext. `Depends()` itu
DI per-request. Untuk singleton (repo, service) kita rakit sekali di sini, simpan di
`app.state`, lalu diambil lewat dependency di api/deps.py.
"""

from dataclasses import dataclass
from datetime import timedelta

from app.persistence.base import NoteRepository
from app.persistence.factory import build_note_repository
from app.security.authenticators import (
    ApiKeyAuthenticator,
    BasicAuthenticator,
    CompositeAuthenticator,
    JwtAuthenticator,
    SessionAuthenticator,
)
from app.security.tokens import TokenService
from app.security.users import UserStore, seeded_user_store
from app.services.note_service import NoteService
from app.settings import Settings


@dataclass
class Container:
    settings: Settings
    users: UserStore
    tokens: TokenService
    repo: NoteRepository
    notes: NoteService
    basic: BasicAuthenticator
    api_key: ApiKeyAuthenticator
    jwt: JwtAuthenticator
    session: SessionAuthenticator
    any: CompositeAuthenticator

    @classmethod  # alternative constructor (factory method)
    def build(cls, settings: Settings, *, repo: NoteRepository | None = None) -> Container:
        users = seeded_user_store()
        tokens = TokenService(
            secret=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
            ttl=timedelta(minutes=settings.jwt_ttl_minutes),
        )
        repo = repo or build_note_repository(settings)
        basic = BasicAuthenticator(users)
        api_key = ApiKeyAuthenticator(users)
        jwt = JwtAuthenticator(users, tokens)
        session = SessionAuthenticator(users)
        return cls(
            settings=settings,
            users=users,
            tokens=tokens,
            repo=repo,
            notes=NoteService(repo),
            basic=basic,
            api_key=api_key,
            jwt=jwt,
            session=session,
            # urutan = prioritas, kayak urutan filter di Spring Security
            any=CompositeAuthenticator(jwt, api_key, session, basic),
        )
