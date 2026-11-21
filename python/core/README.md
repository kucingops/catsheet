# OOP di Python, dari kacamata anak Java

Kode: [`oop/pillars.py`](oop/pillars.py), [`oop/protocols.py`](oop/protocols.py), [`oop/patterns.py`](oop/patterns.py)
Test: [`tests/test_oop.py`](tests/test_oop.py) → `uv run pytest`

## Peta cepat Java → Python

| Java | Python | Catatan |
|---|---|---|
| `private` / `protected` | `_nama` (konvensi), `__nama` (name mangling) | Nggak ada enforcement. "We're all consenting adults." |
| getter/setter | `@property` | Mulai dari atribut biasa, ganti jadi property kalau butuh logic, API nggak berubah |
| `interface` | `ABC` + `@abstractmethod` (nominal) atau `Protocol` (struktural) | `Protocol` = interface implisit kayak Go |
| `abstract class` | `ABC` | Error muncul saat **instansiasi**, bukan compile |
| `record` / Lombok `@Value` | `@dataclass(frozen=True, slots=True)` | Dapat `__init__`, `__repr__`, `__eq__`, `__hash__` gratis |
| `toString()` | `__repr__` (buat developer), `__str__` (buat user) | |
| `equals()` / `hashCode()` | `__eq__` / `__hash__` | Override `__eq__` doang → objek jadi unhashable |
| `Comparable` | `__lt__` + `@functools.total_ordering` | |
| operator overloading | `__add__`, `__len__`, `__iter__`, `__getitem__`, ... | Ini yang bikin `len(x)`, `for i in x`, `a + b` jalan |
| `static` method | `@staticmethod` | |
| static factory `of(...)` | `@classmethod` | Dapat `cls`, jadi ikut subclass |
| generics `<T>` | `class Stack[T]:` (3.12+) | Cuma buat type checker; runtime nggak dicek (mirip erasure) |
| `extends A, B` (nggak bisa) | multiple inheritance boleh | Urutan lookup = MRO (C3), cek `Kelas.__mro__` |
| `final` | `typing.final` / `Final` | Cuma dicek type checker |
| `enum` | `enum.Enum`, `StrEnum` | |
| Checked exception | nggak ada | Semua exception unchecked |

## 4 pilar, singkatnya

1. **Encapsulation.** Sembunyikan state, ekspos behavior. `BankAccount._balance` cuma bisa diubah lewat `deposit/withdraw`; `balance` itu read-only property.
2. **Inheritance.** `SavingsAccount(BankAccount)` override `withdraw` dan panggil `super()`. Hati-hati: inheritance = coupling paling kuat.
3. **Abstraction.** `Shape(ABC)` mendefinisikan kontrak `area()`. `Shape()` langsung → `TypeError`.
4. **Polymorphism.** `total_area(shapes)` nggak peduli bentuknya apa. Di Python ditambah **duck typing**: `broadcast()` menerima objek apa pun yang punya `send()`, tanpa perlu inherit.

Bonus: **composition over inheritance**, contohnya `Order` *punya* `list[LineItem]`, bukan turunan `list`.

## SOLID versi Python (lihat `patterns.py`)

| Prinsip | Contoh di kode |
|---|---|
| **S**ingle Responsibility | `NoteService` (bisnis) vs `NoteRepository` (storage) vs `Authenticator` (login) di app FastAPI |
| **O**pen/Closed | Strategy diskon: tambah fungsi baru, `checkout()` nggak diubah. Registry `@register` buat payment gateway |
| **L**iskov Substitution | Contoh pelanggaran klasik `Square(Rectangle)`. Contoh yang benar: 4 repository lulus contract test yang sama |
| **I**nterface Segregation | `Protocol` kecil (`Notifier` cuma 1 method) |
| **D**ependency Inversion | `StoreService(clock: Clock)` → di test pakai `FixedClock` |

## Pattern yang "menghilang" di Python

- **Strategy / Command** → cukup function atau lambda (function itu first-class object).
- **Singleton** → module-level object, atau `@functools.cache` di factory function.
- **Factory** → dict `{key: Class}` + decorator buat registrasi.
- **Iterator** → generator (`yield`).
- **Decorator (GoF)** → decorator Python (`@`) buat function; untuk objek tetap bisa wrapper class.
- **Builder** → jarang perlu, karena ada keyword argument + default value.

## Gotcha yang sering ditanya

- **Mutable default argument**: `def f(x=[])` → list-nya dipakai bareng antar panggilan. Pakai `None` atau `field(default_factory=list)`.
- **`is` vs `==`**: `is` = identitas (kayak `==` di Java untuk object), `==` = equality (kayak `.equals()`).
- **Class attribute vs instance attribute**: atribut yang didefinisikan di body class itu di-share semua instance.
- **`__slots__`** (atau `@dataclass(slots=True)`): hemat memori & cegah typo atribut baru.
- **Annotations di 3.14 itu lazy (PEP 649/749)**: nggak perlu lagi `from __future__ import annotations` atau tanda kutip buat forward reference (`def __add__(self, other: Money) -> Money` langsung jalan).
- **GIL**: thread nggak jalan paralel untuk kode CPU-bound. 3.14 punya build *free-threaded* resmi (`python3.14t`) tanpa GIL. Untuk I/O-bound, thread & asyncio tetap efektif.

## Pertanyaan interview yang umum

1. Bedanya `@staticmethod` dan `@classmethod`? → classmethod dapat `cls`, dipakai untuk alternative constructor yang tetap benar di subclass.
2. Apa itu MRO? Gimana diamond problem diselesaikan? → C3 linearization; `super()` ngikutin MRO, bukan parent langsung.
3. `ABC` vs `Protocol`, kapan pakai yang mana? → ABC kalau mau shared implementation & isinstance yang ketat; Protocol kalau mau decoupling (kelas pihak ketiga yang nggak bisa diubah).
4. Kenapa dataclass `frozen=True` bisa jadi key dict? → karena `__hash__` di-generate dan objeknya immutable.
5. Gimana bikin atribut "private"? → nggak bisa beneran; `_x` konvensi, `__x` cuma mangling.
