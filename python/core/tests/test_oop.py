"""Unit test pytest untuk materi OOP.

Ciri khas pytest dibanding JUnit:
- cukup fungsi `test_*`, nggak perlu class (boleh kalau mau grouping)
- assert biasa (pytest rewrite assert-nya biar pesan error detail)
- pytest.raises = assertThrows
- @pytest.mark.parametrize = @ParameterizedTest
- fixture = @BeforeEach + DI sekaligus
"""

from decimal import Decimal
from unittest.mock import Mock

import pytest
from oop.patterns import (
    EventBus,
    FixedClock,
    PaymentMethod,
    Square,
    StoreService,
    checkout,
    flat_cut,
    gateway_for,
    get_config,
    ten_percent,
)
from oop.patterns import (
    Rectangle as LspRectangle,
)
from oop.pillars import (
    BankAccount,
    Circle,
    InsufficientFunds,
    LineItem,
    Order,
    Rectangle,
    SavingsAccount,
    Shape,
    total_area,
)
from oop.protocols import (
    EmailNotifier,
    Money,
    Notifier,
    Pagination,
    SmsNotifier,
    Stack,
    broadcast,
    first,
)


# ---------- fixture -----------------------------------------------------------
@pytest.fixture
def account() -> BankAccount:
    return BankAccount("hilmi", Decimal("100"))


# ---------- encapsulation ----------------------------------------------------
class TestBankAccount:
    def test_deposit_menambah_saldo(self, account: BankAccount) -> None:
        account.deposit(Decimal("50"))
        assert account.balance == Decimal("150")

    def test_balance_read_only(self, account: BankAccount) -> None:
        with pytest.raises(AttributeError):
            account.balance = Decimal("1")  # type: ignore[misc]

    @pytest.mark.parametrize("amount", [Decimal("0"), Decimal("-1")])
    def test_deposit_tidak_boleh_nol_atau_minus(self, account: BankAccount, amount: Decimal) -> None:
        with pytest.raises(ValueError, match="harus > 0"):
            account.deposit(amount)

    def test_withdraw_lebih_dari_saldo(self, account: BankAccount) -> None:
        with pytest.raises(InsufficientFunds):
            account.withdraw(Decimal("101"))


# ---------- inheritance & override -------------------------------------------
def test_savings_override_withdraw() -> None:
    acc = SavingsAccount("a", Decimal("100"))
    acc.withdraw(Decimal("90"))  # sisa 10, masih boleh
    with pytest.raises(InsufficientFunds, match="minimal saldo"):
        acc.withdraw(Decimal("1"))


def test_savings_interest_dan_mro() -> None:
    acc = SavingsAccount("a", Decimal("100"), rate=Decimal("0.05"))
    acc.add_interest()
    assert acc.balance == Decimal("105.00")
    assert SavingsAccount.__mro__[:2] == (SavingsAccount, BankAccount)
    assert isinstance(acc, BankAccount)


# ---------- abstraction & polymorphism ---------------------------------------
def test_abstract_class_tidak_bisa_diinstansiasi() -> None:
    with pytest.raises(TypeError):
        Shape()  # type: ignore[abstract]


def test_polymorphism_total_area() -> None:
    assert total_area([Rectangle(2, 3), Rectangle(1, 1)]) == 7
    assert Circle(1).describe() == "Circle dengan luas 3.14"


def test_dataclass_frozen_equality_dan_hash() -> None:
    assert Circle(2) == Circle(2)
    assert len({Circle(2), Circle(2)}) == 1  # hashable karena frozen


def test_composition_order() -> None:
    order = Order().add(LineItem("A", Decimal("2.5"), 2)).add(LineItem("B", Decimal("1"), 3))
    assert order.total == Decimal("8.0")
    assert len(order) == 2


def test_mutable_default_tidak_dishare() -> None:
    assert Order().items is not Order().items


# ---------- protocol / duck typing -------------------------------------------
def test_protocol_tanpa_inheritance() -> None:
    email = EmailNotifier()
    assert isinstance(email, Notifier)  # runtime_checkable: cuma cek nama method ada
    assert broadcast([email, SmsNotifier()], "x", "halo") == 2
    assert broadcast([email, SmsNotifier()], "x", "a" * 200) == 1
    assert len(email.outbox) == 2


def test_protocol_dengan_mock() -> None:
    fake = Mock(spec=Notifier)  # spec bikin Mock nolak method yang nggak ada
    fake.send.return_value = False
    assert broadcast([fake], "x", "y") == 0
    fake.send.assert_called_once_with("x", "y")


# ---------- generics & dunder ------------------------------------------------
def test_generic_stack() -> None:
    s: Stack[int] = Stack()
    assert not s
    for i in (1, 2, 3):
        s.push(i)
    assert list(s) == [3, 2, 1]
    assert s.pop() == 3 and len(s) == 2


def test_stack_kosong() -> None:
    with pytest.raises(IndexError):
        Stack[str]().pop()


@pytest.mark.parametrize(("items", "expected"), [([1, 2], 1), ([], None)])
def test_first(items: list[int], expected: int | None) -> None:
    assert first(items) == expected


def test_money_operator_overloading() -> None:
    assert Money(100) + Money(50) == Money(150)
    assert Money(1) < Money(2) <= Money(2)  # <= dari @total_ordering
    with pytest.raises(ValueError):
        Money(1) + Money(1, "USD")


def test_pagination_post_init_validation() -> None:
    assert Pagination(3, 10).offset == 20
    with pytest.raises(ValueError):
        Pagination(0, 10)


# ---------- SOLID & patterns -------------------------------------------------
@pytest.mark.parametrize(
    ("strategy", "expected"),
    [(None, 1000), (ten_percent, 900), (flat_cut(300), 700), (flat_cut(5000), 0)],
)
def test_strategy(strategy, expected: int) -> None:
    assert (checkout(1000, strategy) if strategy else checkout(1000)) == expected


def test_factory_registry() -> None:
    assert gateway_for(PaymentMethod.CARD).charge(10) == "card:10"
    assert gateway_for(PaymentMethod("ewallet")).charge(5) == "ewallet:5"


@pytest.mark.parametrize(("hour", "open_"), [(7, False), (8, True), (21, True), (22, False)])
def test_dependency_injection_pakai_fake(hour: int, open_: bool) -> None:
    assert StoreService(FixedClock(hour)).is_open() is open_


def test_singleton_via_cache() -> None:
    assert get_config() is get_config()


def test_observer() -> None:
    bus, received = EventBus(), []
    bus.subscribe("order.paid", received.append)
    assert bus.publish("order.paid", {"id": 1}) == 1
    assert bus.publish("unknown", {}) == 0
    assert received == [{"id": 1}]


def test_liskov_dilanggar_square() -> None:
    """Kode yang benar untuk Rectangle jadi salah untuk Square -> LSP violation."""

    def stretch(r: LspRectangle) -> int:
        r.set_width(10)
        return r.area()

    assert stretch(LspRectangle(2, 5)) == 50
    assert stretch(Square(5)) == 100  # caller expect 50, dapat 100
