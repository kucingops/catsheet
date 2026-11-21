"""Kapan class memang tepat, dan gimana nulisnya biar tetap Pythonic.

Jalankan: uv run python -m pythonic.objects

Aturan praktis:
- Cuma data?                         -> dataclass / NamedTuple (lihat data.py)
- Cuma behavior tanpa state?          -> fungsi di module (module = namespace)
- Strategy/handler 1 method?          -> fungsi / callable (lihat functions.py)
- State + aturan yang harus dijaga?   -> class. Di sinilah OOP benar-benar berguna.
- Shared implementation antar tipe?   -> baru pertimbangkan inheritance / ABC

Kalau dari Java: jangan bikin class cuma karena "semua harus di dalam class".
Kelas `XxxUtils` dengan static method = module biasa di Python.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


class InsufficientFunds(Exception):
    pass


# ---------------------------------------------------------------------------
# 1. Class yang pantas: punya state + invariant (saldo nggak boleh minus).
#    - Mulai dari atribut publik biasa. Nggak usah getter/setter.
#    - Kalau nanti butuh logic, ubah jadi @property; kode pemanggil nggak berubah.
#    - `_nama` = konvensi "internal". Nggak ada `private` beneran.
# ---------------------------------------------------------------------------
class Account:
    def __init__(self, owner: str, balance: Decimal = Decimal(0)) -> None:
        self.owner = owner  # publik, bebas diubah, nggak perlu setOwner()
        self._balance = balance

    @property
    def balance(self) -> Decimal:  # read-only: acc.balance = 1 -> AttributeError
        return self._balance

    def deposit(self, amount: Decimal) -> None:
        if amount <= 0:
            raise ValueError("amount harus > 0")
        self._balance += amount

    def withdraw(self, amount: Decimal) -> None:
        if amount > self._balance:
            raise InsufficientFunds(f"saldo {self._balance} < {amount}")
        self._balance -= amount

    def __repr__(self) -> str:  # toString() versi developer
        return f"Account(owner={self.owner!r}, balance={self._balance})"


# ---------------------------------------------------------------------------
# 2. Composition over inheritance. Ledger *punya* Account, bukan turunan Account.
# ---------------------------------------------------------------------------
@dataclass
class Ledger:
    account: Account
    history: list[tuple[str, Decimal]] = field(default_factory=list)

    def transfer_in(self, amount: Decimal) -> None:
        self.account.deposit(amount)
        self.history.append(("in", amount))

    def transfer_out(self, amount: Decimal) -> None:
        self.account.withdraw(amount)
        self.history.append(("out", amount))


# ---------------------------------------------------------------------------
# 3. Inheritance + ABC: pakai kalau ada implementasi bersama yang beneran di-share
#    (template method). Kalau cuma butuh kontrak, Protocol lebih ringan (protocols.py).
# ---------------------------------------------------------------------------
class Report(ABC):
    def render(self, rows: list[dict]) -> str:  # template method: alurnya tetap
        return "\n".join([self.header(), *(self.row(r) for r in rows)])

    @abstractmethod
    def header(self) -> str: ...

    @abstractmethod
    def row(self, r: dict) -> str: ...


class CsvReport(Report):
    def header(self) -> str:
        return "name,age"

    def row(self, r: dict) -> str:
        return f"{r['name']},{r['age']}"


class MarkdownReport(Report):
    def header(self) -> str:
        return "| name | age |\n|---|---|"

    def row(self, r: dict) -> str:
        return f"| {r['name']} | {r['age']} |"


# ---------------------------------------------------------------------------
# 4. Mixin: multiple inheritance kecil buat nambah kemampuan. Urutan lookup = MRO.
# ---------------------------------------------------------------------------
class JsonMixin:
    def to_json(self) -> dict:
        return {k: v for k, v in vars(self).items() if not k.startswith("_")}


class Customer(JsonMixin):
    def __init__(self, name: str, email: str) -> None:
        self.name = name
        self.email = email
        self._secret = "nggak ikut ke json"


# ---------------------------------------------------------------------------
# 5. Anti-pattern dari Java yang sering kebawa:
# ---------------------------------------------------------------------------
class StringUtils:  # JANGAN: class isinya cuma static method
    @staticmethod
    def shout(s: str) -> str:
        return s.upper() + "!"


def shout(s: str) -> str:  # LAKUKAN: fungsi biasa di module `strings.py`
    return s.upper() + "!"


class JavaStylePerson:  # JANGAN: getter/setter boilerplate
    def __init__(self, name: str) -> None:
        self._name = name

    def get_name(self) -> str:
        return self._name

    def set_name(self, name: str) -> None:
        self._name = name


@dataclass
class Person:  # LAKUKAN: atribut langsung, dataclass urus sisanya
    name: str


if __name__ == "__main__":
    ledger = Ledger(Account("hilmi"))
    ledger.transfer_in(Decimal(100))
    print(ledger, CsvReport().render([{"name": "a", "age": 1}]), Customer.__mro__, sep="\n")
