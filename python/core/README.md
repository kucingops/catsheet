# Python yang Pythonic (buat anak Java)

Kode: [`pythonic/`](pythonic/) · Test: [`tests/test_pythonic.py`](tests/test_pythonic.py) → `uv run pytest`
Tiap modul bisa dijalankan langsung: `uv run python -m pythonic.functions`

Python itu multi-paradigma. OOP ada, tapi bukan default. Kode Python yang bagus biasanya
kelihatan kayak gini: **data di dataclass, logic di fungsi, koleksi diolah pakai comprehension
atau generator, resource dibungkus `with`, dan polymorphism lewat duck typing**. Class dipakai
kalau memang ada state yang harus dijaga.

```python
>>> import this   # The Zen of Python, baca sekali, sering ditanya
Simple is better than complex.
Flat is better than nested.
There should be one-- and preferably only one --obvious way to do it.
```

## Urutan baca

| # | Modul | Isi | Pengganti apa di Java |
|---|---|---|---|
| 1 | [`functions.py`](pythonic/functions.py) | fungsi sebagai value, closure, dispatch table, decorator, `functools` (`cache`, `partial`, `singledispatch`) | Strategy/Command/Factory class, AOP, method overloading |
| 2 | [`data.py`](pythonic/data.py) | `@dataclass`, `NamedTuple`, `TypedDict`, `StrEnum`, `match/case`, immutable update | `record`, Lombok, `enum`, `switch` pattern |
| 3 | [`iteration.py`](pythonic/iteration.py) | list/dict/set comprehension, generator & `yield`, `itertools`, `collections` | Stream API, `Iterator<T>`, `Collectors` |
| 4 | [`protocols.py`](pythonic/protocols.py) | duck typing, `Protocol`, DI lewat parameter, generics 3.12+, dunder method | `interface`, `Comparable`, constructor injection |
| 5 | [`resources.py`](pythonic/resources.py) | `with`, `@contextmanager`, `ExitStack`, EAFP vs LBYL, exception chaining, `ExceptionGroup` | try-with-resources, checked exception |
| 6 | [`objects.py`](pythonic/objects.py) | kapan class itu tepat, `@property`, composition, ABC + template method, mixin, anti-pattern | 4 pilar OOP |

## Kebiasaan Java → versi Python

| Kebiasaan dari Java | Versi Pythonic | Contoh |
|---|---|---|
| Interface + N class buat Strategy | fungsi biasa / lambda | `checkout(total, ten_percent)` |
| Strategy berparameter (field + constructor) | closure | `flat_cut(15_000)` |
| `switch`/factory `Map<String, Bean>` | dict berisi fungsi + decorator registrasi | `PAYMENT_HANDLERS`, `@payment("card")` |
| AOP `@Around` | decorator | `@retry(3)`, `@timed` |
| Singleton | variabel module, atau `@cache` di fungsi | `get_settings()` |
| Method overloading | default/keyword argument, `@singledispatch` | `describe(x)` |
| Class `XxxUtils` + static method | fungsi di module | `shout()` vs `StringUtils.shout()` |
| Getter/setter | atribut publik, nanti `@property` kalau perlu | `Account.balance` |
| `record` / Lombok `@Value` | `@dataclass(frozen=True, slots=True)` | `Money` |
| Pair/Tuple class | `NamedTuple`, atau tuple biasa + unpacking | `count, total, avg = stats(xs)` |
| `stream().filter().map().toList()` | comprehension | `[x * x for x in xs if x % 2 == 0]` |
| `implements Iterator<T>` | generator `yield` | `countdown(3)` |
| `implements Foo` | nggak perlu: duck typing / `Protocol` | `broadcast([EmailNotifier(), SmsNotifier()])` |
| `<T extends Comparable<T>>` | `def smallest[T: SupportsLessThan](...)` | |
| `Comparator.comparing(...)` | `key=` function | `sorted(people, key=lambda p: (-p["age"], p["name"]))` |
| try-with-resources | `with` + `@contextmanager` | `with transaction(log):` |
| `if (map.containsKey(k))` lalu `get` | EAFP: `try: d[k] except KeyError` | `port_eafp()` |
| `for (int i = 0; ...)` | `enumerate`, `zip`, `range` | `numbered()`, `to_dict()` |
| Constructor injection | parameter fungsi (default bisa diganti di test) | `greeting(clock=lambda: 7)` |

## Terus OOP-nya di mana?

Masih ada, cuma ditaruh di tempat yang pas ([`objects.py`](pythonic/objects.py)):

- **Encapsulation**: `Account` punya invariant (saldo nggak boleh minus), `_balance` + `@property`.
  Nggak ada `private` beneran, `_x` itu konvensi, `__x` cuma name mangling.
- **Composition**: `Ledger` *punya* `Account`.
- **Inheritance + abstraction**: `Report(ABC)` dengan template method `render()`. ABC dipakai karena
  ada implementasi yang di-share. Kalau cuma butuh kontrak, pakai `Protocol`.
- **Polymorphism**: lebih sering lewat duck typing daripada lewat hierarki class.
- **Mixin** + MRO: `Customer(JsonMixin)`, cek `Customer.__mro__`.

Di app FastAPI, prinsip yang sama dipakai: entity pakai dataclass dengan behavior (`Note.edit()`),
repository pakai `Protocol` (nggak ada `extends`), service dan authenticator berupa fungsi. Lihat
[`../DECISIONS.md`](../DECISIONS.md).

## Gotcha yang sering ditanya

- **Mutable default argument**: `def f(x=[])` → list-nya dipakai bareng antar panggilan. Pakai `None` atau `field(default_factory=list)`.
- **`is` vs `==`**: `is` = identitas (kayak `==` objek di Java), `==` = equality (kayak `.equals()`).
- **Late binding closure**: `[lambda: i for i in range(3)]` semuanya return 2. Fix: `lambda i=i: i`.
- **Generator cuma bisa dipakai sekali**: habis di-`list()`, iterasi kedua kosong.
- **`groupby` cuma ngelompokin yang berurutan**: sort dulu kalau mau kayak SQL `GROUP BY`.
- **Class attribute vs instance attribute**: atribut di body class di-share semua instance.
- **`return NotImplemented` di dunder** (bukan `raise NotImplementedError`) supaya Python coba operand satunya.
- **Annotations di 3.14 itu lazy (PEP 649/749)**: forward reference (`-> Money` di dalam class `Money`) langsung jalan tanpa tanda kutip.
- **`except A, B:` tanpa kurung** valid sejak 3.14 (PEP 758).
- **GIL**: thread nggak paralel untuk CPU-bound. 3.14 punya build free-threaded resmi (`python3.14t`). Untuk I/O-bound, thread & asyncio tetap efektif.

## Pertanyaan interview yang umum

1. **Apa itu "Pythonic"?** Kode yang memanfaatkan idiom bahasa: comprehension, `with`, unpacking, duck typing, EAFP, fungsi sebagai value. Lawannya: Java/C ditulis pakai sintaks Python.
2. **List comprehension vs generator expression?** `[...]` langsung bikin list di memori; `(...)` lazy, satu-satu. Pakai generator buat data besar/stream atau kalau cuma diiterasi sekali (`sum(x for x in xs)`).
3. **Apa itu closure? Contoh kegunaannya?** Fungsi dalam yang ingat variabel scope luar. Dipakai buat decorator, factory fungsi, dependency injection ringan.
4. **Decorator itu apa sebenarnya?** Sintaks gula untuk `f = deco(f)`. Decorator berparameter = fungsi yang mengembalikan decorator.
5. **`ABC` vs `Protocol`?** ABC = nominal, harus inherit, bisa bawa implementasi bersama. Protocol = struktural, nggak perlu inherit, cocok buat decoupling dan kelas pihak ketiga.
6. **EAFP vs LBYL?** Python lebih suka coba dulu lalu tangkap exception. Lebih ringkas dan bebas race condition antara "cek" dan "pakai".
7. **Kenapa `@dataclass(frozen=True)` bisa jadi key dict?** Karena `__hash__` di-generate dan objeknya immutable.
8. **`@staticmethod` vs `@classmethod`?** classmethod dapat `cls`, dipakai buat alternative constructor (`Version.parse`). staticmethod jarang perlu, biasanya cukup fungsi module.
9. **Context manager itu apa?** Objek dengan `__enter__`/`__exit__`. `__exit__` dipanggil walau ada exception. Cara gampang bikinnya: `@contextmanager` + `yield`.
10. **Kapan tetap pakai class?** Kalau ada state yang berubah dan invariant yang harus dijaga, atau butuh banyak method yang berbagi state yang sama.
