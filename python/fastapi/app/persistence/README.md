# Persistence: dari tanpa database sampai ORM

Satu kontrak [`NoteRepository`](base.py), empat implementasi. Pilih lewat env `APP_STORAGE`.

| File | Cara simpan | Setara di Java | Kapan dipakai |
|---|---|---|---|
| [`memory.py`](memory.py) | `dict` di RAM | `ConcurrentHashMap` | test, prototyping, cache |
| [`json_file.py`](json_file.py) | file JSON | Jackson ke file | config kecil, CLI tool, data single-user |
| [`sqlite_raw.py`](sqlite_raw.py) | SQL mentah via `sqlite3` (DB-API) | `JdbcTemplate` | query kompleks/performa kritikal, tim yang jago SQL |
| [`sqlalchemy_repo.py`](sqlalchemy_repo.py) | ORM SQLAlchemy 2.x | JPA / Hibernate | CRUD aplikasi pada umumnya |

Bukti semuanya setara: [`tests/test_repositories.py`](../../tests/test_repositories.py) menjalankan
test yang sama ke keempat implementasi (contract test).

## ORM vs non-ORM

**ORM (SQLAlchemy)**

- (+) mapping otomatis, dirty checking (ubah atribut → `UPDATE` otomatis saat commit), relasi, unit of work
- (+) portable antar database
- (−) SQL yang dihasilkan bisa kejutan (N+1), ada "magic" (lazy load, session state)

**SQL mentah (DB-API)**

- (+) kontrol penuh, gampang di-tune, nggak ada magic
- (−) mapping manual (`_map(row)` = RowMapper), rawan SQL injection kalau ceroboh, boilerplate

**Tanpa DB (memory/file)**

- (+) nol dependency
- (−) nggak ada transaksi, concurrency terbatas (cuma `threading.Lock` dalam 1 proses), nggak bisa
  multi-instance

## SQLAlchemy 2.x cheat sheet (versi Hibernate)

| JPA / Hibernate | SQLAlchemy 2.x |
|---|---|
| `@Entity`, `@Column` | `class X(Base)` + `Mapped[int] = mapped_column(...)` |
| `EntityManager` | `Session` |
| `@Transactional` | `with Session.begin():` (commit/rollback otomatis) |
| `em.persist(x)` | `session.add(x)` lalu `flush()` untuk dapat ID |
| `em.find(X.class, id)` | `session.get(X, id)` |
| JPQL / Criteria | `select(X).where(X.owner == "a")` + `session.scalars(stmt)` |
| `@OneToMany(fetch = LAZY)` | `relationship(..., lazy="select")` (default) |
| `JOIN FETCH` / `@EntityGraph` | `options(selectinload(X.items))` atau `joinedload` |
| `LazyInitializationException` | `DetachedInstanceError` |
| `AttributeConverter` | `TypeDecorator` (lihat `UtcDateTime`) |
| Flyway / Liquibase | Alembic |
| Spring Data `JpaRepository` | nggak ada bawaan; tulis repository sendiri (kayak di sini) atau pakai SQLModel |

**N+1 di SQLAlchemy:**

```python
# BURUK: 1 query authors + N query books
for a in session.scalars(select(Author)):
    print(a.books)

# BAIK: 2 query total
stmt = select(Author).options(selectinload(Author.books))
```

## Hal yang sengaja ditunjukin

- **Domain dipisah dari ORM model** (`Note` vs `NoteRow` + `to_domain()`). Ini hexagonal style.
  Trade-off: lebih banyak mapping. Alternatif pragmatis: pakai `NoteRow` langsung sebagai entity
  (gaya Spring/JPA biasa) atau SQLModel (Pydantic + SQLAlchemy jadi satu).
- **Bug timezone SQLite** ketahuan dari contract test: SQLite nggak nyimpen tzinfo, jadi datetime UTC
  balik jadi naive. Diperbaiki pakai `TypeDecorator`. Pelajaran: selalu simpan waktu dalam UTC.
- **Atomic write** di JSON repo (`tmp` file + `os.replace`).
- **Parameter binding** (`?`, `:name`) di SQL mentah. Jangan pernah f-string ke SQL.
- **Repo mengembalikan copy/detached object**, jadi ubah objek tanpa `save()` nggak ngefek. Ada testnya.
- **`StaticPool`** untuk SQLite `:memory:`: tanpa ini tiap koneksi dapat database kosong sendiri.
- `create_all()` cuma buat demo; production pakai migrasi Alembic.

## Async

Repo di sini sync. Versi async: `create_async_engine("postgresql+asyncpg://...")` + `AsyncSession`
+ `await session.execute(...)`, lalu endpoint jadi `async def`. Jangan campur: driver sync di
`async def` = event loop ke-block.

## Pertanyaan interview

1. Apa itu N+1 dan cara ngatasinnya?
2. Bedanya `flush()` dan `commit()`? (flush kirim SQL dalam transaksi, commit menutup transaksi)
3. Apa itu unit of work / identity map? (session melacak object yang di-load; `get` dua kali dengan ID
   sama → object yang sama)
4. Kapan pilih SQL mentah dibanding ORM?
5. Gimana mencegah SQL injection?
