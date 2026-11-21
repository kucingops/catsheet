# Python

Versi: **Python 3.14** · **FastAPI 0.165** · SQLAlchemy 2.1 · Pydantic 2.14 · pytest 9.2
Package manager: [`uv`](https://docs.astral.sh/uv/) (anggap aja Maven/Gradle-nya Python, tapi jauh lebih cepat).

```
python/
├── DECISIONS.md           # kenapa ditulis begini (dan bukan gaya Java)
├── core/                  # Python yang "Pythonic" + unit test
│   ├── pythonic/functions.py  # first-class function, closure, decorator, functools
│   ├── pythonic/data.py       # dataclass, NamedTuple, Enum, match/case
│   ├── pythonic/iteration.py  # comprehension, generator, itertools
│   ├── pythonic/protocols.py  # duck typing, Protocol, generics, dunder
│   ├── pythonic/resources.py  # context manager, EAFP, exception
│   ├── pythonic/objects.py    # kapan class memang perlu, anti-pattern dari Java
│   └── tests/
└── fastapi/               # REST API: multiple login + 4 cara simpan data
    ├── app/
    │   ├── domain/        # dataclass entity & aturan bisnis (tanpa framework)
    │   ├── persistence/   # memory, JSON file, SQL mentah, ORM SQLAlchemy
    │   ├── security/      # Basic, API key, JWT, session cookie
    │   ├── services/
    │   └── api/
    └── tests/             # unit + contract + integration test
```

| Topik | Baca |
|---|---|
| Gaya Pythonic (dan bedanya sama Java) | [core/README.md](core/README.md) |
| Kenapa nggak ditulis ala Java | [DECISIONS.md](DECISIONS.md) |
| Arsitektur app FastAPI & cara jalanin | [fastapi/README.md](fastapi/README.md) |
| Security / multiple login | [fastapi/app/security/README.md](fastapi/app/security/README.md) |
| Persistence: ORM vs non-ORM | [fastapi/app/persistence/README.md](fastapi/app/persistence/README.md) |
| Unit test dengan pytest | [fastapi/tests/README.md](fastapi/tests/README.md) |

## Quick start

```bash
# sekali aja
curl -LsSf https://astral.sh/uv/install.sh | sh

cd python/core    && uv run pytest        # 55 test
cd python/fastapi && uv run pytest        # 87 test
cd python/fastapi && uv run fastapi dev app/main.py   # buka http://localhost:8000/docs
```

`uv` otomatis download Python 3.14 + bikin virtualenv `.venv` kalau belum ada.

Lint & format pakai [ruff](https://docs.astral.sh/ruff/) (gantinya Checkstyle + Spotless):

```bash
uvx ruff check . && uvx ruff format --check .
```

CI: [`.github/workflows/python.yml`](../.github/workflows/python.yml) jalanin ruff + pytest untuk
`core` dan `fastapi` setiap ada perubahan di `python/`.
