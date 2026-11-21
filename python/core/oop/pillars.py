"""4 pilar OOP versi Python, dibandingin langsung sama kebiasaan di Java.

Jalankan: python -m oop.pillars   (dari folder python/core)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


# ---------------------------------------------------------------------------
# 1. ENCAPSULATION
# Python nggak punya `private`. Konvensinya:
#   _nama   -> "internal, jangan disentuh dari luar" (cuma kesepakatan)
#   __nama  -> name mangling jadi _Kelas__nama (buat hindari bentrok di subclass,
#              BUKAN buat security)
# Getter/setter ala Java diganti @property, jadi API tetap kelihatan kayak field.
# ---------------------------------------------------------------------------
class InsufficientFunds(Exception):
    pass


class BankAccount:
    def __init__(self, owner: str, balance: Decimal = Decimal("0")) -> None:
        self.owner = owner
        self._balance = balance  # state internal, diubah lewat method saja

    @property
    def balance(self) -> Decimal:  # read-only dari luar: acc.balance = 1 -> AttributeError
        return self._balance

    def deposit(self, amount: Decimal) -> None:
        if amount <= 0:
            raise ValueError("amount harus > 0")
        self._balance += amount

    def withdraw(self, amount: Decimal) -> None:
        if amount > self._balance:
            raise InsufficientFunds(f"saldo {self._balance} < {amount}")
        self._balance -= amount

    def __repr__(self) -> str:  # setara toString()
        return f"BankAccount(owner={self.owner!r}, balance={self._balance})"


# ---------------------------------------------------------------------------
# 2. INHERITANCE
# super() sama kayak Java. Bedanya Python boleh multiple inheritance,
# urutan resolve method pakai MRO (C3 linearization): Kelas.__mro__
# ---------------------------------------------------------------------------
class SavingsAccount(BankAccount):
    def __init__(self, owner: str, balance: Decimal = Decimal("0"), rate: Decimal = Decimal("0.03")) -> None:
        super().__init__(owner, balance)
        self.rate = rate

    def add_interest(self) -> None:
        self._balance += (self._balance * self.rate).quantize(Decimal("0.01"))

    # override: tabungan nggak boleh minus sama sekali & ada minimal saldo
    def withdraw(self, amount: Decimal) -> None:
        if self._balance - amount < Decimal("10"):
            raise InsufficientFunds("minimal saldo tabungan 10")
        super().withdraw(amount)


# ---------------------------------------------------------------------------
# 3. ABSTRACTION
# ABC + @abstractmethod = abstract class / interface di Java.
# Kelas yang belum implement semua abstract method nggak bisa di-instantiate
# (TypeError saat dibuat, bukan saat compile).
# ---------------------------------------------------------------------------
class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

    # concrete method di abstract class, kayak default method / template method
    def describe(self) -> str:
        return f"{type(self).__name__} dengan luas {self.area():.2f}"


# dataclass = generate __init__, __repr__, __eq__ otomatis (mirip record / Lombok @Data)
# frozen=True -> immutable + hashable, mirip Java record
@dataclass(frozen=True)
class Circle(Shape):
    radius: float

    def area(self) -> float:
        return 3.141592653589793 * self.radius**2


@dataclass(frozen=True)
class Rectangle(Shape):
    width: float
    height: float

    def area(self) -> float:
        return self.width * self.height


# ---------------------------------------------------------------------------
# 4. POLYMORPHISM
# Satu fungsi, banyak bentuk. Di Python ada 2 rasa:
#  - nominal (lewat inheritance, kayak Java)       -> total_area di bawah
#  - duck typing ("kalau bisa quack, ya bebek")     -> lihat protocols.py
# ---------------------------------------------------------------------------
def total_area(shapes: list[Shape]) -> float:
    return sum(s.area() for s in shapes)


# ---------------------------------------------------------------------------
# Bonus: COMPOSITION over inheritance
# Order *punya* list item, bukan *turunan* dari list.
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class LineItem:
    sku: str
    price: Decimal
    qty: int

    @property
    def subtotal(self) -> Decimal:
        return self.price * self.qty


@dataclass
class Order:
    items: list[LineItem] = field(default_factory=list)  # JANGAN pakai default [] (mutable default gotcha)

    def add(self, item: LineItem) -> Order:
        self.items.append(item)
        return self  # fluent

    @property
    def total(self) -> Decimal:
        return sum((i.subtotal for i in self.items), Decimal("0"))

    def __len__(self) -> int:  # dunder method: len(order) jalan
        return len(self.items)


if __name__ == "__main__":
    acc = SavingsAccount("hilmi", Decimal("100"))
    acc.add_interest()
    print(acc, SavingsAccount.__mro__)
    print(total_area([Circle(1), Rectangle(2, 3)]))
    print(Order().add(LineItem("A", Decimal("2.5"), 4)).total)
