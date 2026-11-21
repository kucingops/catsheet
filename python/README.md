# Python

Versi: **Python 3.14** · **FastAPI 0.165** · SQLAlchemy 2.1 · Pydantic 2.14 · pytest 9.2
Package manager: [`uv`](https://docs.astral.sh/uv/) (anggap aja Maven/Gradle-nya Python, tapi jauh lebih cepat).

```
python/
├── core/                  # OOP murni Python + unit test
│   ├── oop/pillars.py     # 4 pilar OOP, composition
│   ├── oop/protocols.py   # duck typing, Protocol, generics, dunder
│   ├── oop/patterns.py    # SOLID + design pattern versi Pythonic
│   └── tests/
└── fastapi/               # REST API: multiple login + 4 cara simpan data
    ├── app/
    │   ├── domain/        # entity & aturan bisnis (tanpa framework)
    │   ├── persistence/   # memory, JSON file, SQL mentah, ORM SQLAlchemy
    │   ├── security/      # Basic, API key, JWT, session cookie
    │   ├── services/
    │   └── api/
    └── tests/             # unit + contract + integration test
```

| Topik | Baca |
|---|---|
| OOP di Python (vs Java) | [core/README.md](core/README.md) |
| Arsitektur app FastAPI & cara jalanin | [fastapi/README.md](fastapi/README.md) |
| Security / multiple login | [fastapi/app/security/README.md](fastapi/app/security/README.md) |
| Persistence: ORM vs non-ORM | [fastapi/app/persistence/README.md](fastapi/app/persistence/README.md) |
| Unit test dengan pytest | [fastapi/tests/README.md](fastapi/tests/README.md) |

## Quick start

```bash
# sekali aja
curl -LsSf https://astral.sh/uv/install.sh | sh

cd python/core    && uv run pytest        # 32 test
cd python/fastapi && uv run pytest        # 82 test
cd python/fastapi && uv run fastapi dev app/main.py   # buka http://localhost:8000/docs
```

`uv` otomatis download Python 3.14 + bikin virtualenv `.venv` kalau belum ada.
