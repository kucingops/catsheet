"""Data: dataclass, NamedTuple, Enum, TypedDict, dan pattern matching.

Jalankan: uv run python -m pythonic.data

Kalau dari Java: ini wilayah `record`, Lombok `@Value/@Data`, `enum`, dan `switch` pattern.
Bedanya di Python data dan behavior nggak wajib digabung. Fungsi yang menerima data
itu normal, nggak semua logic harus jadi method.
"""

from dataclasses import dataclass, field, replace
from decimal import Decimal
from enum import StrEnum, auto
from typing import NamedTuple, TypedDict


# ---------------------------------------------------------------------------
# 1. @dataclass: generate __init__, __repr__, __eq__ (dan __hash__ kalau frozen).
#    frozen=True  -> immutable, bisa jadi key dict / anggota set (mirip record)
#    slots=True   -> hemat memori, typo atribut langsung error
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class Money:
    amount: Decimal
    currency: str = "IDR"

    def __post_init__(self) -> None:  # validasi setelah __init__ hasil generate
        if self.amount < 0:
            raise ValueError("amount nggak boleh negatif")

    # Operator overloading lewat dunder. Ini yang bikin `a + b` dan sum() jalan.
    def __add__(self, other: Money) -> Money:
        if self.currency != other.currency:
            return NotImplemented  # konvensi Python: biar Python coba other.__radd__ dulu
        return Money(self.amount + other.amount, self.currency)


@dataclass(slots=True)
class Cart:
    owner: str
    items: list[LineItem] = field(default_factory=list)  # JANGAN `= []`, lihat gotcha di README

    @property
    def total(self) -> Money:  # @property: hitungan yang kelihatan kayak field
        return sum((i.subtotal for i in self.items), Money(Decimal(0)))


# ---------------------------------------------------------------------------
# 2. NamedTuple: tuple yang field-nya punya nama. Immutable, bisa di-unpack.
#    Cocok buat return value kecil. Kalau dari Java: pengganti class Pair/Tuple.
# ---------------------------------------------------------------------------
class LineItem(NamedTuple):
    sku: str
    price: Money
    qty: int = 1

    @property
    def subtotal(self) -> Money:
        return Money(self.price.amount * self.qty, self.price.currency)


class Stats(NamedTuple):
    count: int
    total: int
    average: float


def stats(numbers: list[int]) -> Stats:
    total = sum(numbers)
    return Stats(len(numbers), total, total / len(numbers) if numbers else 0.0)


# ---------------------------------------------------------------------------
# 3. TypedDict: kasih tipe ke dict biasa (misal hasil json.loads).
#    Di runtime tetap dict, jadi nol overhead. Kalau butuh validasi, pakai Pydantic.
# ---------------------------------------------------------------------------
class UserJson(TypedDict):
    name: str
    age: int


def adults(users: list[UserJson]) -> list[str]:
    return [u["name"] for u in users if u["age"] >= 18]


# ---------------------------------------------------------------------------
# 4. Enum. StrEnum = nilainya string beneran, enak buat JSON/DB.
# ---------------------------------------------------------------------------
class Status(StrEnum):
    PENDING = auto()  # auto() di StrEnum = nama lowercase -> "pending"
    PAID = auto()
    SHIPPED = auto()
    CANCELLED = auto()


# ---------------------------------------------------------------------------
# 5. Structural pattern matching (match/case, 3.10+).
#    Jauh lebih kuat dari switch Java: bisa bongkar tuple, dict, dataclass sekaligus.
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Point:
    x: float
    y: float


def where(p: Point) -> str:
    match p:
        case Point(x=0, y=0):
            return "titik asal"
        case Point(x=0):
            return "di sumbu y"
        case Point(y=0):
            return "di sumbu x"
        case Point(x=x, y=y) if x == y:  # guard
            return "di garis diagonal"
        case _:
            return "di tempat lain"


def handle(event: dict) -> str:
    """Match dict: cuma cek key yang disebut, key lain diabaikan."""
    match event:
        case {"type": "order", "status": Status.PAID, "id": order_id}:
            return f"kirim order {order_id}"
        case {"type": "order", "status": "cancelled" | "refunded"}:
            return "stop proses"
        case {"type": "ping"}:
            return "pong"
        case _:
            return "abaikan"


def next_status(current: Status) -> Status:
    match current:
        case Status.PENDING:
            return Status.PAID
        case Status.PAID:
            return Status.SHIPPED
        case _:
            raise ValueError(f"nggak ada status setelah {current}")


# ---------------------------------------------------------------------------
# 6. Immutable update: replace() bikin copy dengan field yang diubah
#    (mirip `toBuilder()` Lombok / `with`-er di record).
# ---------------------------------------------------------------------------
def raise_price(item: LineItem, percent: int) -> LineItem:
    new_price = replace(item.price, amount=item.price.amount * (100 + percent) / 100)
    return item._replace(price=new_price)  # NamedTuple punya _replace sendiri


if __name__ == "__main__":
    cart = Cart("hilmi", [LineItem("A", Money(Decimal("2.5")), 4), LineItem("B", Money(Decimal(10)))])
    print(cart, cart.total)
    print(stats([3, 4, 5]), where(Point(2, 2)), handle({"type": "ping"}))
