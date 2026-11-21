"""SOLID + design pattern yang sering ditanya, versi Pythonic.

Banyak pattern GoF di Java jadi "hilang" di Python karena function itu
first-class object: Strategy cukup callable, Singleton cukup module, dst.
"""

from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from functools import cache

# --- Strategy (Open/Closed Principle) ---------------------------------------
# Tambah diskon baru = tambah fungsi baru, kode checkout nggak diubah.
type DiscountStrategy = Callable[[int], int]


def no_discount(total: int) -> int:
    return total


def ten_percent(total: int) -> int:
    return total * 90 // 100


def flat_cut(amount: int) -> DiscountStrategy:  # closure = strategy berparameter
    return lambda total: max(total - amount, 0)


def checkout(total: int, discount: DiscountStrategy = no_discount) -> int:
    return discount(total)


# --- Factory + Registry (decorator) ------------------------------------------
class PaymentMethod(StrEnum):
    CARD = "card"
    EWALLET = "ewallet"


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: int) -> str: ...


_REGISTRY: dict[PaymentMethod, type[PaymentGateway]] = {}


def register(method: PaymentMethod):
    """Decorator kelas: daftarin implementasi ke factory (mirip @Component + Map<String,Bean>)."""

    def wrap(cls: type[PaymentGateway]) -> type[PaymentGateway]:
        _REGISTRY[method] = cls
        return cls

    return wrap


@register(PaymentMethod.CARD)
class CardGateway(PaymentGateway):
    def charge(self, amount: int) -> str:
        return f"card:{amount}"


@register(PaymentMethod.EWALLET)
class EwalletGateway(PaymentGateway):
    def charge(self, amount: int) -> str:
        return f"ewallet:{amount}"


def gateway_for(method: PaymentMethod) -> PaymentGateway:
    try:
        return _REGISTRY[method]()
    except KeyError:
        raise ValueError(f"method {method} belum didukung") from None


# --- Dependency Inversion + Dependency Injection (manual, tanpa framework) ---
# High-level (OrderService) bergantung ke abstraksi (Clock), bukan ke datetime.
# Efeknya: gampang di-unit test pakai fake.
class Clock(ABC):
    @abstractmethod
    def hour(self) -> int: ...


class SystemClock(Clock):
    def hour(self) -> int:
        from datetime import datetime

        return datetime.now().hour


@dataclass
class FixedClock(Clock):  # fake buat test
    fixed_hour: int

    def hour(self) -> int:
        return self.fixed_hour


class StoreService:
    def __init__(self, clock: Clock) -> None:  # constructor injection
        self._clock = clock

    def is_open(self) -> bool:
        return 8 <= self._clock.hour() < 22


# --- Singleton ---------------------------------------------------------------
# Cara paling Pythonic: module-level instance (module cuma di-import sekali).
# Kalau butuh lazy: @cache di factory function. Hindari metaclass kecuali perlu.
@cache
def get_config() -> dict[str, str]:
    return {"env": "dev"}


# --- Observer ----------------------------------------------------------------
class EventBus:
    def __init__(self) -> None:
        self._subs: dict[str, list[Callable[[dict], None]]] = {}

    def subscribe(self, topic: str, handler: Callable[[dict], None]) -> None:
        self._subs.setdefault(topic, []).append(handler)

    def publish(self, topic: str, payload: dict) -> int:
        handlers = self._subs.get(topic, [])
        for h in handlers:
            h(payload)
        return len(handlers)


# --- Liskov Substitution: contoh PELANGGARAN klasik --------------------------
class Rectangle:
    def __init__(self, w: int, h: int) -> None:
        self.w, self.h = w, h

    def set_width(self, w: int) -> None:
        self.w = w

    def area(self) -> int:
        return self.w * self.h


class Square(Rectangle):  # "Square is-a Rectangle" secara matematika, tapi...
    def __init__(self, side: int) -> None:
        super().__init__(side, side)

    def set_width(self, w: int) -> None:  # ...behavior berubah: tinggi ikut berubah
        self.w = self.h = w
