# Keputusan desain: Python ditulis gaya Python, bukan gaya Java

Versi awal cheatsheet ini menjelaskan Python "dari kacamata Java": 4 pilar OOP, SOLID, design
pattern GoF, lalu app FastAPI dengan `ABC` di mana-mana, class `NoteService`, dan hierarki
`Authenticator`. Hasilnya jalan, tapi itu Java yang ditulis pakai sintaks Python. Di interview
Python, yang dinilai justru seberapa idiomatis kodenya. Jadi materinya dibalik: **mulai dari cara
Python sendiri, Java cuma jadi catatan pembanding**.

## 1. `core/oop` diganti `core/pythonic`

**Keputusan:** materi inti dipecah per idiom (fungsi, data, iterasi, protocol, resource, object),
bukan per pilar OOP.

**Alasan:** 4 pilar OOP itu sudah dibahas di cheatsheet Java. Yang beda dan sering ditanya di
Python adalah first-class function, comprehension/generator, context manager, duck typing, EAFP,
dataclass. OOP tetap ada di `objects.py`, tapi dengan framing "kapan class memang perlu".

**Konsekuensi:** test lama `test_oop.py` (32 test) diganti `test_pythonic.py` (55 test).

## 2. Repository: `ABC` → `typing.Protocol`

**Keputusan:** `NoteRepository` jadi `Protocol`. Empat implementasi nggak inherit apa pun.

**Alasan:** nggak ada implementasi yang di-share, jadi ABC cuma nambah coupling dan upacara.
Protocol = structural typing: cocok bentuknya = valid, dicek type checker. Perilakunya tetap
dijamin contract test yang jalan ke 4 implementasi.

**Tetap class**, karena repository memang pegang state: koneksi DB, path file, lock.

## 3. Service: class `NoteService` → fungsi di module `services/notes.py`

**Keputusan:** `notes.create(repo, user, ...)`, `notes.get(repo, user, id)`, dst.

**Alasan:** `NoteService` cuma nyimpan satu field (`_repo`) dan nggak punya state lain. Itu tanda
class-nya nggak perlu. Module sudah jadi namespace, dan repository dikirim eksplisit sebagai
argumen. Test jadi lebih sederhana: nggak perlu rakit objek, cukup panggil fungsi dengan repo
palsu (Mock atau in-memory).

**Trade-off:** tiap pemanggilan harus kirim `repo`. Kalau nanti service butuh banyak dependency
(repo, mailer, clock, ...), opsi yang masuk akal: tetap fungsi dengan dependency lewat parameter,
atau balik ke class/dataclass kecil. Untuk satu dependency, fungsi lebih jelas.

## 4. Authenticator: hierarki class → fungsi + closure

**Keputusan:** `type Authenticator = Callable[[Request], User | None]`. Factory `basic(users)`,
`api_key(users)`, `bearer_jwt(users, tokens)`, `session(users)` mengembalikan closure.
`first_match(*auths)` menggantikan `CompositeAuthenticator`.

**Alasan:** interface dengan satu method di Python = callable. Strategy + Composite + Chain of
Responsibility tetap ada konsepnya, cuma nggak perlu 6 class. Di test, authenticator palsu cukup
`lambda _: user`.

**Yang hilang:** atribut `scheme` di class. Sekarang nama scheme ditulis eksplisit di
`api/deps.py` (untuk 401 tanpa kredensial) dan dibawa `AuthError` (untuk kredensial salah).

## 5. `Container.build()` classmethod → `build_container()` fungsi

`Container` tinggal frozen dataclass berisi dependency (record), perakitannya di fungsi biasa.

## 6. Yang sengaja TIDAK diubah

| Bagian | Kenapa tetap begitu |
|---|---|
| `Note`, `User` (dataclass dengan method) | data + aturan bisnis yang nempel ke datanya. Ini OOP yang wajar di Python. |
| `UserStore` (class) | pegang state (dict user) + beberapa operasi yang berbagi state itu |
| `TokenService` (frozen dataclass) | konfigurasi (secret, ttl, issuer) + 2 operasi. Bisa juga fungsi + partial, tapi dataclass lebih jelas |
| Exception hierarchy (`DomainError` dst.) | exception di Python memang class, dan hierarki dipakai buat mapping ke HTTP status |
| Pydantic model, SQLAlchemy `DeclarativeBase` | API library-nya memang berbasis class |

## 7. Tooling

- **ruff** untuk lint + format, rule set `E, F, I, UP, B, SIM, C4, RUF` di tiap `pyproject.toml`.
  `UP` (pyupgrade) sekalian maksa sintaks modern (3.12+ generics, `type` alias).
- Dependency FastAPI pakai `Annotated[..., Security(...)]`, bukan default argument `= Security(...)`.
  Ini gaya yang direkomendasikan FastAPI sekarang, dan lolos rule B008.
- **CI** di `.github/workflows/python.yml`: job matrix `core` dan `fastapi`, masing-masing
  `ruff check`, `ruff format --check`, `pytest`. Cuma jalan kalau ada perubahan di `python/`.
