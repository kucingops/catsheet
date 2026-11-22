"""Unit test materi Pythonic. Ciri khas pytest dibanding JUnit:

- cukup fungsi `test_*`, nggak perlu class
- assert biasa (pytest rewrite assert-nya biar pesan error detail)
- pytest.raises = assertThrows, @pytest.mark.parametrize = @ParameterizedTest
- fixture bawaan kayak `tmp_path`, `monkeypatch`, `capsys` di-inject lewat nama parameter
"""

import io
from decimal import Decimal

import pytest

from pythonic import data, functions, iteration, objects, protocols, resources


# ---------------- functions.py ----------------
@pytest.mark.parametrize(
    ("discount", "expected"),
    [
        (functions.no_discount, 100),
        (functions.ten_percent, 90),
        (functions.flat_cut(30), 70),
        (functions.flat_cut(500), 0),
    ],
)
def test_strategy_cukup_fungsi(discount, expected: int) -> None:
    assert functions.checkout(100, discount) == expected


def test_strategy_lambda_juga_bisa() -> None:
    assert functions.checkout(100, lambda t: t - 1) == 99


def test_dispatch_table_dari_decorator() -> None:
    assert set(functions.PAYMENT_HANDLERS) == {"card", "ewallet"}
    assert functions.pay("ewallet", 5) == "ewallet:5"
    with pytest.raises(ValueError, match="belum didukung"):
        functions.pay("bitcoin", 1)


def test_retry_decorator() -> None:
    calls = []

    @functions.retry(3, on=ConnectionError)
    def flaky() -> str:
        calls.append(1)
        if len(calls) < 3:
            raise ConnectionError
        return "ok"

    assert flaky() == "ok" and len(calls) == 3
    assert flaky.__name__ == "flaky"  # efek @wraps


def test_retry_menyerah() -> None:
    @functions.retry(2)
    def always_fail() -> None:
        raise RuntimeError("x")

    with pytest.raises(RuntimeError):
        always_fail()


def test_timed_simpan_atribut_di_fungsi() -> None:
    slow = functions.timed(lambda: sum(range(10_000)))
    slow()
    assert slow.last_elapsed > 0


def test_cache_dan_singleton() -> None:
    assert functions.fib(90) == 2880067194370816120  # tanpa cache ini nggak selesai-selesai
    assert functions.get_settings() is functions.get_settings()


def test_partial_singledispatch_compose() -> None:
    assert (functions.square(4), functions.cube(2)) == (16, 8)
    assert functions.describe(3) == "int 3"
    assert functions.describe([1, 2]) == "list isi 2"
    assert functions.describe("x") == "object 'x'"
    assert functions.compose(str.upper, str.strip)("  hi ") == "HI"


def test_key_function() -> None:
    people = [{"name": "b", "age": 30}, {"name": "a", "age": 30}, {"name": "c", "age": 20}]
    assert functions.oldest(people)["name"] == "b"
    assert [p["name"] for p in functions.sort_people(people)] == ["a", "b", "c"]


# ---------------- data.py ----------------
def test_dataclass_frozen_hashable_dan_validasi() -> None:
    m = data.Money(Decimal(10))
    assert m == data.Money(Decimal(10)) and {m: "ok"}[data.Money(Decimal(10))] == "ok"
    with pytest.raises(AttributeError):
        m.amount = Decimal(1)  # type: ignore[misc]
    with pytest.raises(ValueError):
        data.Money(Decimal(-1))


def test_dunder_add_dan_not_implemented() -> None:
    assert data.Money(Decimal(1)) + data.Money(Decimal(2)) == data.Money(Decimal(3))
    with pytest.raises(TypeError):  # NotImplemented di dua sisi -> TypeError
        data.Money(Decimal(1)) + data.Money(Decimal(1), "USD")


def test_cart_default_factory_dan_property() -> None:
    a, b = data.Cart("a"), data.Cart("b")
    a.items.append(data.LineItem("X", data.Money(Decimal("2.5")), 4))
    assert b.items == []  # list nggak di-share antar instance
    assert a.total == data.Money(Decimal(10))


def test_namedtuple_bisa_diunpack() -> None:
    count, total, avg = data.stats([2, 4])
    assert (count, total, avg) == (2, 6, 3.0)
    assert data.stats([]).average == 0.0


def test_typeddict_tetap_dict() -> None:
    users: list[data.UserJson] = [{"name": "a", "age": 20}, {"name": "b", "age": 10}]
    assert data.adults(users) == ["a"]


def test_strenum() -> None:
    assert data.Status.PAID == "paid"
    assert data.next_status(data.Status.PENDING) is data.Status.PAID
    with pytest.raises(ValueError):
        data.next_status(data.Status.CANCELLED)


@pytest.mark.parametrize(
    ("point", "expected"),
    [
        (data.Point(0, 0), "titik asal"),
        (data.Point(0, 5), "di sumbu y"),
        (data.Point(5, 0), "di sumbu x"),
        (data.Point(3, 3), "di garis diagonal"),
        (data.Point(1, 2), "di tempat lain"),
    ],
)
def test_match_dataclass(point: data.Point, expected: str) -> None:
    assert data.where(point) == expected


def test_match_dict() -> None:
    assert data.handle({"type": "order", "status": "paid", "id": 7, "extra": 1}) == "kirim order 7"
    assert data.handle({"type": "order", "status": "refunded"}) == "stop proses"
    assert data.handle({"type": "ping"}) == "pong"
    assert data.handle({}) == "abaikan"


def test_replace_immutable() -> None:
    item = data.LineItem("A", data.Money(Decimal(100)))
    new = data.raise_price(item, 10)
    assert new.price.amount == Decimal(110) and item.price.amount == Decimal(100)


# ---------------- iteration.py ----------------
def test_comprehension() -> None:
    assert iteration.even_squares(range(7)) == [0, 4, 16, 36]
    assert iteration.index_by_name([{"name": "a"}])["a"] == {"name": "a"}
    assert iteration.unique_domains(["x@A.com", "y@a.com", "z@b.id"]) == {"a.com", "b.id"}
    assert iteration.flatten([[1, 2], [3]]) == [1, 2, 3]


def test_generator_lazy_dan_sekali_pakai() -> None:
    gen = iteration.countdown(3)
    assert list(gen) == [3, 2, 1]
    assert list(gen) == []  # generator habis setelah dikonsumsi
    assert iteration.take(5, iteration.fibonacci()) == [0, 1, 1, 2, 3]


def test_pipeline_generator() -> None:
    lines = ["# komentar", "", "host = localhost", "port=8080"]
    assert list(iteration.read_records(lines)) == [
        {"key": "host", "value": "localhost"},
        {"key": "port", "value": "8080"},
    ]


def test_yield_from_rekursif() -> None:
    assert list(iteration.walk({"a": {"b": {}, "c": {"d": {}}}})) == ["a", "b", "c", "d"]


def test_iterable_lewat_dunder() -> None:
    p = iteration.Playlist("x", "y")
    assert list(p) == ["x", "y"] and len(p) == 2 and "y" in p


def test_collections_dan_itertools() -> None:
    assert iteration.word_count("a b a c b a") == [("a", 3), ("b", 2), ("c", 1)]
    assert iteration.group_by_length(["hi", "yo", "hey"]) == {2: ["hi", "yo"], 3: ["hey"]}
    assert iteration.runs("aabccc") == [("a", 2), ("b", 1), ("c", 3)]
    assert iteration.first_n_fib_below(10) == [0, 1, 1, 2, 3, 5, 8]
    assert iteration.chunks(range(5), 2) == [(0, 1), (2, 3), (4,)]
    assert iteration.deltas([1, 4, 9]) == [3, 5]
    assert iteration.merge([3, 1], [2]) == [1, 2, 3]
    assert iteration.numbered(["a", "b"]) == ["1. a", "2. b"]


def test_zip_strict() -> None:
    assert iteration.to_dict("ab", [1, 2]) == {"a": 1, "b": 2}
    with pytest.raises(ValueError):
        iteration.to_dict("abc", [1])


# ---------------- protocols.py ----------------
def test_duck_typing_apa_saja_yang_punya_write() -> None:
    buf = io.StringIO()
    protocols.dump_json({"a": 1}, buf)
    assert buf.getvalue() == '{"a": 1}'

    class Collector:
        def __init__(self) -> None:
            self.parts: list[str] = []

        def write(self, s: str) -> None:
            self.parts.append(s)

    c = Collector()
    protocols.dump_json([1], c)
    assert c.parts == ["[1]"]


def test_sized_protocol() -> None:
    assert protocols.total_size("abc", [1, 2], iteration.Playlist("x")) == 6


def test_protocol_tanpa_inheritance() -> None:
    email = protocols.EmailNotifier()
    assert protocols.broadcast([email, protocols.SmsNotifier()], "a", "x" * 200) == 1
    assert isinstance(email, protocols.Notifier)  # runtime_checkable
    assert protocols.Notifier not in type(email).__mro__  # tapi bukan turunannya


def test_di_lewat_parameter() -> None:
    assert protocols.greeting(clock=lambda: 7) == "selamat pagi"
    assert protocols.greeting(clock=lambda: 20) == "selamat malam"
    assert protocols.is_store_open(9) and not protocols.is_store_open(23)


def test_generics() -> None:
    assert protocols.smallest([3, 1, 2]) == 1
    assert protocols.smallest([]) is None
    assert protocols.first(["a"]) == "a"


def test_dataclass_order_dan_classmethod() -> None:
    versions = sorted(map(protocols.Version.parse, ["1.10.0", "1.2.3", "1.2"]))
    assert [str(v) for v in versions] == ["1.2.0", "1.2.3", "1.10.0"]


def test_callable_object() -> None:
    assert list(map(protocols.Multiplier(3), [1, 2])) == [3, 6]


# ---------------- resources.py ----------------
def test_context_manager_commit_dan_rollback() -> None:
    log: list[str] = []
    with resources.transaction(log):
        log.append("INSERT")
    assert log == ["BEGIN", "INSERT", "COMMIT"]

    log.clear()
    with pytest.raises(ZeroDivisionError), resources.transaction(log):
        _ = 1 / 0
    assert log == ["BEGIN", "ROLLBACK"]


def test_working_dir_balik_walau_error(tmp_path) -> None:
    import os

    before = os.getcwd()
    with pytest.raises(RuntimeError), resources.working_dir(tmp_path):
        assert os.getcwd() == str(tmp_path)
        raise RuntimeError
    assert os.getcwd() == before


def test_class_context_manager() -> None:
    with resources.Connection("db") as conn:
        assert not conn.closed
    assert conn.closed


def test_exit_stack_tutup_yang_sudah_dibuka() -> None:
    ok = resources.open_all(["a", "b"])
    assert not any(c.closed for c in ok)  # sukses -> nggak ditutup
    with pytest.raises(ValueError):
        resources.open_all(["a", ""])


@pytest.mark.parametrize(
    ("config", "port"), [({"port": "9000"}, 9000), ({"port": "abc"}, 8080), ({}, 8080), ({"port": None}, 8080)]
)
def test_eafp_sama_dengan_lbyl(config: dict, port: int) -> None:
    assert resources.port_eafp(config) == resources.port_lbyl(config) == port


def test_file_eafp(tmp_path) -> None:
    f = tmp_path / "x.txt"
    assert resources.read_or_default(f, "kosong") == "kosong"
    f.write_text("isi")
    assert resources.read_or_default(f) == "isi"
    resources.remove_if_exists(f)
    resources.remove_if_exists(f)  # kedua kali nggak error
    assert not f.exists()


def test_exception_chaining() -> None:
    with pytest.raises(resources.ConfigError) as exc:
        resources.load_port("abc")
    assert isinstance(exc.value.__cause__, ValueError)


def test_exception_group() -> None:
    assert resources.parse_all(["80", "443"]) == [80, 443]
    with pytest.raises(ExceptionGroup) as exc:
        resources.parse_all(["x", "80", "99999"])
    assert len(exc.value.exceptions) == 2


# ---------------- objects.py ----------------
def test_account_invariant_dan_property() -> None:
    acc = objects.Account("hilmi", Decimal(50))
    acc.deposit(Decimal(25))
    with pytest.raises(objects.InsufficientFunds):
        acc.withdraw(Decimal(100))
    with pytest.raises(AttributeError):
        acc.balance = Decimal(0)  # type: ignore[misc]
    assert acc.balance == Decimal(75)


def test_composition() -> None:
    ledger = objects.Ledger(objects.Account("a"))
    ledger.transfer_in(Decimal(10))
    ledger.transfer_out(Decimal(4))
    assert ledger.account.balance == Decimal(6) and len(ledger.history) == 2


def test_template_method_dan_abc() -> None:
    rows = [{"name": "a", "age": 1}]
    assert objects.CsvReport().render(rows) == "name,age\na,1"
    assert objects.MarkdownReport().render(rows).endswith("| a | 1 |")
    with pytest.raises(TypeError):
        objects.Report()  # type: ignore[abstract]


def test_mixin() -> None:
    assert objects.Customer("a", "a@x").to_json() == {"name": "a", "email": "a@x"}


def test_anti_pattern_vs_pythonic() -> None:
    assert objects.StringUtils.shout("hi") == objects.shout("hi")
    p = objects.Person("a")
    p.name = "b"
    assert p == objects.Person("b")
