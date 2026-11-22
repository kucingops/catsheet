"""Duck typing dan Protocol: polymorphism tanpa inheritance.

Jalankan: uv run python -m pythonic.protocols

"If it walks like a duck and quacks like a duck, it's a duck."
Python nggak nanya "kamu turunan siapa", tapi "kamu bisa apa".

Kalau dari Java: interface itu nominal (harus `implements`). Protocol itu struktural,
persis interface di Go: cocok secara bentuk = dianggap implementasi. Protocol cuma
dicek type checker (mypy/pyright); di runtime tetap duck typing biasa.
"""

import json
from collections.abc import Callable, Iterable, Sized
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol, runtime_checkable


# ---------------------------------------------------------------------------
# 1. Duck typing murni: fungsi ini nggak peduli tipenya, asal punya .write()
#    File, StringIO, socket wrapper, objek buatan sendiri, semua bisa.
# ---------------------------------------------------------------------------
def dump_json(data: object, out) -> None:  # sengaja tanpa type hint di `out`
    out.write(json.dumps(data))


def total_size(*things: Sized) -> int:
    """Sized = protocol bawaan: apa pun yang punya __len__ (str, list, dict, class kita)."""
    return sum(len(t) for t in things)


# ---------------------------------------------------------------------------
# 2. Protocol: duck typing yang bisa dicek type checker.
#    Kelas di bawah NGGAK inherit Notifier, tapi tetap dianggap Notifier.
#    Ini Interface Segregation versi Python: protocol kecil, 1-2 method.
# ---------------------------------------------------------------------------
@runtime_checkable  # opsional: biar bisa isinstance(x, Notifier). Cuma cek nama method.
class Notifier(Protocol):
    def send(self, to: str, message: str) -> bool: ...


@dataclass
class EmailNotifier:
    outbox: list[tuple[str, str]] = field(default_factory=list)

    def send(self, to: str, message: str) -> bool:
        self.outbox.append((to, message))
        return True


class SmsNotifier:
    def send(self, to: str, message: str) -> bool:
        return len(message) <= 160


def broadcast(notifiers: Iterable[Notifier], to: str, message: str) -> int:
    return sum(n.send(to, message) for n in notifiers)  # True dihitung 1


# ---------------------------------------------------------------------------
# 3. Dependency injection tanpa framework: terima callable/protocol lewat parameter.
#    Kalau dari Java: constructor injection + interface Clock. Di sini cukup
#    parameter fungsi dengan default. Test tinggal kirim lambda.
# ---------------------------------------------------------------------------
def is_store_open(now_hour: int) -> bool:
    return 8 <= now_hour < 22


def greeting(clock: Callable[[], int] = lambda: datetime.now().hour) -> str:
    hour = clock()
    return "selamat pagi" if hour < 12 else "selamat siang" if hour < 18 else "selamat malam"


# ---------------------------------------------------------------------------
# 4. Generics (syntax 3.12+). Cuma informasi buat type checker, runtime nggak cek
#    (mirip type erasure di Java).
# ---------------------------------------------------------------------------
class SupportsLessThan(Protocol):
    def __lt__(self, other: object, /) -> bool: ...


def smallest[T: SupportsLessThan](items: Iterable[T]) -> T | None:
    """T dibatasi (bound) ke tipe yang bisa dibandingkan, kayak <T extends Comparable<T>>."""
    return min(items, default=None)


def first[T](items: list[T]) -> T | None:
    return items[0] if items else None


# ---------------------------------------------------------------------------
# 5. Dunder method = "protocol" bawaan bahasa. Implement dunder yang tepat,
#    objekmu langsung nyambung ke sintaks & builtin Python.
#      __len__ -> len(x)      __iter__ -> for, list(x)   __contains__ -> `in`
#      __eq__  -> ==          __lt__   -> sorted, min    __add__      -> +
#      __call__ -> x()        __enter__/__exit__ -> with __getitem__  -> x[i]
#      __bool__ -> if x:      __repr__ -> debug print    __hash__     -> key dict
# ---------------------------------------------------------------------------
@dataclass(frozen=True, order=True)  # order=True generate __lt__, __le__, dst dari urutan field
class Version:
    major: int
    minor: int = 0
    patch: int = 0

    @classmethod  # alternative constructor, kayak static factory `Version.of("1.2.3")`
    def parse(cls, text: str) -> Version:
        return cls(*map(int, text.split(".")))

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"


class Multiplier:
    """__call__: objek yang bisa dipanggil kayak fungsi (callable object).
    Biasanya closure sudah cukup; pakai ini kalau butuh state yang bisa diinspeksi."""

    def __init__(self, factor: int) -> None:
        self.factor = factor

    def __call__(self, x: int) -> int:
        return x * self.factor


if __name__ == "__main__":
    print(broadcast([EmailNotifier(), SmsNotifier()], "hilmi", "halo"))
    print(sorted(map(Version.parse, ["1.10.0", "1.2.3", "1.2.0"])))
    print(smallest(["pisang", "apel"]), list(map(Multiplier(3), [1, 2])))
