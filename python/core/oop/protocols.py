"""Duck typing, Protocol, generics (syntax 3.12+), dan dunder methods."""

from collections.abc import Iterator
from dataclasses import dataclass
from functools import total_ordering
from typing import Protocol, runtime_checkable


# ---------------------------------------------------------------------------
# Protocol = structural typing. Kelas TIDAK perlu `implements`/inherit.
# Asal punya method yang cocok, type checker (mypy/pyright) anggap valid.
# Di Java mirip interface, tapi "implicit". Di Go ini persis interface-nya Go.
# ---------------------------------------------------------------------------
@runtime_checkable  # biar bisa dicek pakai isinstance() saat runtime
class Notifier(Protocol):
    def send(self, to: str, message: str) -> bool: ...


class EmailNotifier:  # perhatikan: nggak inherit Notifier
    def __init__(self) -> None:
        self.outbox: list[tuple[str, str]] = []

    def send(self, to: str, message: str) -> bool:
        self.outbox.append((to, message))
        return True


class SmsNotifier:
    def send(self, to: str, message: str) -> bool:
        return len(message) <= 160  # anggap gagal kalau kepanjangan


def broadcast(notifiers: list[Notifier], to: str, message: str) -> int:
    """Polymorphism tanpa inheritance: return jumlah yang sukses."""
    return sum(1 for n in notifiers if n.send(to, message))


# ---------------------------------------------------------------------------
# Generics. Sejak 3.12 nggak perlu TypeVar manual:  class Stack[T]
# Ingat: generics di Python cuma buat type checker, runtime-nya nggak dicek
# (mirip type erasure di Java).
# ---------------------------------------------------------------------------
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("stack kosong")
        return self._items.pop()

    def __len__(self) -> int:
        return len(self._items)

    def __iter__(self) -> Iterator[T]:  # bikin bisa dipakai di for-loop
        return reversed(self._items)

    def __bool__(self) -> bool:
        return bool(self._items)


type Pair[K, V] = tuple[K, V]  # type alias (3.12+), mirip typedef


def first[T](items: list[T]) -> T | None:  # generic function
    return items[0] if items else None


# ---------------------------------------------------------------------------
# Dunder (double underscore) = cara Python "overload operator".
# __eq__/__hash__ = equals()/hashCode(). Aturannya sama: kalau override __eq__,
# objek mutable sebaiknya unhashable; dataclass(frozen=True) urus dua-duanya.
# ---------------------------------------------------------------------------
@total_ordering  # cukup definisi __eq__ + __lt__, sisanya (<=, >, >=) di-generate
@dataclass(frozen=True)
class Money:
    amount: int  # simpan dalam sen biar nggak ada masalah float
    currency: str = "IDR"

    def __add__(self, other: Money) -> Money:
        self._check(other)
        return Money(self.amount + other.amount, self.currency)

    def __lt__(self, other: Money) -> bool:
        self._check(other)
        return self.amount < other.amount

    def _check(self, other: Money) -> None:
        if self.currency != other.currency:
            raise ValueError("currency beda")


@dataclass(frozen=True)
class Pagination:
    page: int
    size: int

    def __post_init__(self) -> None:  # validasi setelah __init__ hasil generate
        if self.page < 1 or self.size < 1:
            raise ValueError("page & size minimal 1")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size
