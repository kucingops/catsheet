"""Function itu first-class object. Ini yang bikin banyak pattern Java "hilang" di Python.

Jalankan: uv run python -m pythonic.functions

Kalau dari Java: bayangin semua method reference / lambda bisa disimpan di variabel,
dikirim ke fungsi lain, dikembalikan dari fungsi, dan dimasukin ke dict, tanpa perlu
`@FunctionalInterface`. Strategy, Command, Template Method, Factory biasanya cukup fungsi.
"""

import time
from collections.abc import Callable, Iterable
from functools import cache, partial, reduce, singledispatch, wraps
from operator import itemgetter

# ---------------------------------------------------------------------------
# 1. Fungsi = value. "Strategy pattern" cukup fungsi biasa.
#    Kalau dari Java: interface DiscountStrategy + 3 class implementasi -> di sini 3 fungsi.
# ---------------------------------------------------------------------------
type Discount = Callable[[int], int]  # type alias (3.12+), cuma buat type checker


def no_discount(total: int) -> int:
    return total


def ten_percent(total: int) -> int:
    return total * 90 // 100


def flat_cut(amount: int) -> Discount:
    """Closure: fungsi yang "ingat" variabel dari scope luarnya (amount).
    Ini cara Pythonic bikin "strategy berparameter" tanpa class + constructor."""

    def apply(total: int) -> int:
        return max(total - amount, 0)

    return apply


def checkout(total: int, discount: Discount = no_discount) -> int:
    return discount(total)


# ---------------------------------------------------------------------------
# 2. Dispatch table: dict berisi fungsi. Pengganti switch/if-else panjang dan
#    pengganti Factory/Registry ala Spring (Map<String, Bean>).
#    Decorator dipakai buat registrasi, jadi nambah handler = nambah fungsi doang.
# ---------------------------------------------------------------------------
PAYMENT_HANDLERS: dict[str, Callable[[int], str]] = {}


def payment(method: str) -> Callable[[Callable[[int], str]], Callable[[int], str]]:
    def register(fn: Callable[[int], str]) -> Callable[[int], str]:
        PAYMENT_HANDLERS[method] = fn
        return fn  # fungsinya nggak diubah, cuma dicatat

    return register


@payment("card")
def charge_card(amount: int) -> str:
    return f"card:{amount}"


@payment("ewallet")
def charge_ewallet(amount: int) -> str:
    return f"ewallet:{amount}"


def pay(method: str, amount: int) -> str:
    try:  # EAFP: langsung coba, tangani kalau gagal (lihat errors.py)
        handler = PAYMENT_HANDLERS[method]
    except KeyError:
        raise ValueError(f"metode {method!r} belum didukung") from None
    return handler(amount)


# ---------------------------------------------------------------------------
# 3. Decorator = fungsi yang menerima fungsi dan mengembalikan fungsi.
#    Kalau dari Java: mirip AOP (@Around advice), tapi tanpa proxy/framework.
#    @wraps menyalin __name__/__doc__ fungsi asli (biar stack trace & docs rapi).
# ---------------------------------------------------------------------------
def retry(times: int, *, on: type[Exception] = Exception) -> Callable:
    """Decorator berparameter = fungsi yang mengembalikan decorator (3 level)."""

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except on:
                    if attempt == times:
                        raise
            return None  # nggak pernah sampai sini, tapi type checker senang

        return wrapper

    return decorator


def timed(fn: Callable) -> Callable:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            wrapper.last_elapsed = time.perf_counter() - start  # fungsi juga object, bisa punya atribut

    wrapper.last_elapsed = 0.0
    return wrapper


# ---------------------------------------------------------------------------
# 4. functools: toolbox fungsional bawaan.
# ---------------------------------------------------------------------------
@cache  # memoization. Juga dipakai sebagai "singleton lazy" (lihat get_settings)
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)


@cache
def get_settings() -> dict[str, str]:
    """Singleton ala Python: fungsi + @cache, atau cukup variabel level module.
    Module cuma di-import sekali, jadi variabel module itu sudah singleton."""
    return {"env": "dev"}


def power(base: int, exp: int) -> int:
    return base**exp


square = partial(power, exp=2)  # partial application: "kunci" sebagian argumen
cube = partial(power, exp=3)


@singledispatch  # overloading berdasarkan tipe argumen pertama (Python nggak punya method overloading)
def describe(value: object) -> str:
    return f"object {value!r}"


@describe.register
def _(value: int) -> str:
    return f"int {value}"


@describe.register
def _(value: list) -> str:
    return f"list isi {len(value)}"


# ---------------------------------------------------------------------------
# 5. Higher-order function + key function.
#    Kalau dari Java: Comparator.comparing(User::getAge) -> key=itemgetter("age")
# ---------------------------------------------------------------------------
def compose(*fns: Callable) -> Callable:
    """compose(f, g, h)(x) == f(g(h(x)))"""
    return reduce(lambda f, g: lambda x: f(g(x)), fns)


def oldest(people: Iterable[dict]) -> dict:
    return max(people, key=itemgetter("age"))


def sort_people(people: Iterable[dict]) -> list[dict]:
    # sort by age desc, lalu name asc. sorted() stabil, key bisa tuple.
    return sorted(people, key=lambda p: (-p["age"], p["name"]))


if __name__ == "__main__":
    print(checkout(100_000, flat_cut(15_000)), pay("card", 10))
    print(fib(80), square(7), cube(3), describe([1, 2]))
    print(compose(str.upper, str.strip)("  halo  "))
