# FastAPI: multiple login + 4 cara simpan data

App notes sederhana. Tiap user punya note sendiri, admin bisa lihat semua. Kecil, tapi cukup buat
nunjukin layering, DI, security, dan persistence.

## Jalanin

```bash
uv run fastapi dev app/main.py                                # storage in-memory (default)
APP_STORAGE=json uv run fastapi dev app/main.py               # simpan ke data/notes.json
APP_STORAGE=sqlite APP_SQLITE_PATH=data/raw.db uv run fastapi dev app/main.py
APP_STORAGE=sqlalchemy APP_DATABASE_URL=sqlite:///data/orm.db uv run fastapi dev app/main.py
uv run pytest                                                 # 87 test
```

Swagger UI: http://localhost:8000/docs (tombol **Authorize** bisa pakai Basic, API key, atau OAuth2 password → JWT).

User demo (lihat `app/security/users.py`):

| username | password | role | API key |
|---|---|---|---|
| alice | alice123 | user | `alice-api-key` |
| bob | bob123 | user | – |
| admin | admin123 | user, admin | `admin-api-key` |

```bash
curl -u alice:alice123 localhost:8000/whoami/basic
curl -H 'X-API-Key: admin-api-key' localhost:8000/admin/notes
TOKEN=$(curl -s -d 'username=bob&password=bob123' localhost:8000/auth/token | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" -X POST localhost:8000/notes -H 'content-type: application/json' -d '{"title":"halo"}'
curl -c jar -H 'content-type: application/json' -d '{"username":"alice","password":"alice123"}' localhost:8000/auth/session/login
curl -b jar localhost:8000/whoami/session
```

## Arsitektur

```
HTTP ──► api/ (router, DTO Pydantic, dependency security)
            │  Depends(any_user) ──► security/ (fungsi: basic | api_key | bearer_jwt | session)
            ▼
         services/notes.py  (fungsi: business rule, ownership check)
            │  bergantung ke abstraksi
            ▼
         persistence/NoteRepository (Protocol, structural typing)
            ├── InMemoryNoteRepository   (dict)
            ├── JsonFileNoteRepository   (file)
            ├── SqliteNoteRepository     (SQL mentah)
            └── SqlAlchemyNoteRepository (ORM)
         domain/  Note, User, Role, exceptions  ← nggak import apa pun dari layer lain
```

Semua dependency dirakit sekali di [`app/container.py`](app/container.py) (`build_container()`,
composition root) lalu diambil di endpoint lewat `Depends`. Class cuma dipakai di tempat yang memang
punya state (repository yang pegang koneksi, `UserStore`) atau data (dataclass `Note`, `User`, DTO
Pydantic). Service dan authenticator sengaja dibikin fungsi, alasannya di
[`../DECISIONS.md`](../DECISIONS.md). App dibuat lewat factory `create_app(settings, repo=...)` supaya
test bisa bikin app terisolasi.

## Spring Boot → FastAPI

| Spring Boot | FastAPI / Python |
|---|---|
| `@RestController`, `@GetMapping` | `APIRouter`, `@router.get` |
| `@RequestBody` + Bean Validation | parameter bertipe Pydantic `BaseModel` + `Field(min_length=...)` |
| `@PathVariable`, `@RequestParam` | parameter function biasa (`note_id: int`, `include_archived: bool = False`) |
| IoC container, `@Autowired` | `Depends()` (per request) + composition root manual untuk singleton |
| `@ControllerAdvice` | `@app.exception_handler(DomainError)` |
| `application.yml` + `@ConfigurationProperties` | `pydantic-settings` (`BaseSettings`, env prefix `APP_`) |
| `@Profile` / `@ConditionalOnProperty` | `match settings.storage:` di `persistence/factory.py` |
| `@PostConstruct` / `@PreDestroy` | `lifespan` context manager |
| Filter / `SecurityFilterChain` | dependency (`Depends(jwt_user)`) atau middleware |
| springdoc-openapi | bawaan: `/docs`, `/redoc`, `/openapi.json` |
| Servlet thread-per-request | ASGI + event loop; endpoint `def` dijalankan di threadpool, `async def` di event loop |

## Pertanyaan interview FastAPI

1. **`def` vs `async def` di endpoint?** `async def` jalan di event loop, jadi kalau di dalamnya ada blocking I/O (requests, sqlite3, `time.sleep`) seluruh server ke-block. `def` otomatis dilempar ke threadpool. Pakai `async def` hanya kalau semua I/O-nya async (httpx.AsyncClient, asyncpg, SQLAlchemy `AsyncSession`).
2. **Gimana DI di FastAPI?** `Depends(fn)`: dependency bisa nested, di-cache per request, dan bisa diganti di test via `app.dependency_overrides[fn] = fake`.
3. **Validasi di mana?** Bentuk data di DTO Pydantic (422 otomatis). Aturan bisnis di domain (`Note.__post_init__`, `Note.edit`). Contoh: title `"   "` lolos Pydantic tapi ditolak domain.
4. **Kenapa DTO dipisah dari entity?** Supaya `password_hash` nggak bocor, dan kontrak API stabil walau tabel berubah.
5. **Deploy?** `fastapi run` / `uvicorn app.main:app --workers N` di belakang reverse proxy, atau gunicorn + uvicorn worker. Scale horizontal pakai beberapa process (karena GIL).
