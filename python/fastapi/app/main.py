"""Entry point. Jalankan:  uv run fastapi dev app/main.py   lalu buka http://localhost:8000/docs

App factory `create_app()` (bukan global app langsung) supaya test bisa bikin app
baru dengan config/repo berbeda per test -> test terisolasi.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from app.api import auth, notes
from app.container import Container
from app.domain.models import ArchivedNoteError, DomainError, NoteNotFound, NotOwner
from app.persistence.base import NoteRepository
from app.settings import Settings

# Mapping exception domain -> HTTP status (mirip @ControllerAdvice + @ExceptionHandler)
_STATUS: dict[type[DomainError], int] = {
    NoteNotFound: status.HTTP_404_NOT_FOUND,
    NotOwner: status.HTTP_403_FORBIDDEN,
    ArchivedNoteError: status.HTTP_409_CONFLICT,
}


def create_app(settings: Settings | None = None, *, repo: NoteRepository | None = None) -> FastAPI:
    settings = settings or Settings()
    container = Container.build(settings, repo=repo)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # startup (mirip @PostConstruct / ApplicationReadyEvent)
        yield
        # shutdown (mirip @PreDestroy): tutup koneksi DB
        container.repo.close()

    app = FastAPI(title="catsheet: Python + FastAPI", version="0.1.0", lifespan=lifespan)
    app.state.container = container

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        same_site="lax",  # proteksi dasar CSRF
        https_only=False,  # True di production
        max_age=60 * 60,
    )

    @app.exception_handler(DomainError)
    async def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
        code = next((s for t, s in _STATUS.items() if isinstance(exc, t)), status.HTTP_400_BAD_REQUEST)
        return JSONResponse({"detail": str(exc)}, status_code=code)

    @app.exception_handler(ValueError)
    async def validation_error_handler(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)

    app.include_router(auth.router)
    app.include_router(auth.whoami)
    app.include_router(notes.router)
    app.include_router(notes.admin)
    return app


app = create_app()
