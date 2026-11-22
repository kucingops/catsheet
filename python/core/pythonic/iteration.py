"""Comprehension, generator, dan itertools. Cara Python mengolah koleksi.

Jalankan: uv run python -m pythonic.iteration

Kalau dari Java: ini pengganti Stream API. Bedanya generator itu lazy secara default
dan bisa ditulis sebagai fungsi biasa pakai `yield`, tanpa Spliterator/collector.
"""

from collections import Counter, defaultdict
from collections.abc import Iterable, Iterator
from itertools import batched, chain, groupby, islice, pairwise, takewhile


# ---------------------------------------------------------------------------
# 1. Comprehension: list / dict / set. Ganti for + append.
#    Java:   list.stream().filter(x -> x % 2 == 0).map(x -> x * x).toList()
#    Python: [x * x for x in xs if x % 2 == 0]
# ---------------------------------------------------------------------------
def even_squares(xs: Iterable[int]) -> list[int]:
    return [x * x for x in xs if x % 2 == 0]


def index_by_name(users: Iterable[dict]) -> dict[str, dict]:
    return {u["name"]: u for u in users}  # Collectors.toMap


def unique_domains(emails: Iterable[str]) -> set[str]:
    return {e.split("@", 1)[1].lower() for e in emails}


def flatten(matrix: Iterable[Iterable[int]]) -> list[int]:
    return [x for row in matrix for x in row]  # urutan for sama kayak nested loop


# ---------------------------------------------------------------------------
# 2. Generator: fungsi dengan `yield`. Lazy, hemat memori, bisa infinite.
#    Ini juga cara Pythonic bikin Iterator (pengganti implements Iterator<T>).
# ---------------------------------------------------------------------------
def countdown(n: int) -> Iterator[int]:
    while n > 0:
        yield n
        n -= 1


def fibonacci() -> Iterator[int]:  # infinite, aman karena lazy
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b


def read_records(lines: Iterable[str]) -> Iterator[dict[str, str]]:
    """Pipeline lazy: tiap baris diproses satu-satu, file 10 GB pun aman."""
    rows = (line.strip() for line in lines)  # generator expression: () bukan []
    rows = (r for r in rows if r and not r.startswith("#"))
    for row in rows:
        key, _, value = row.partition("=")
        yield {"key": key.strip(), "value": value.strip()}


def walk(tree: dict) -> Iterator[str]:
    """`yield from` = delegasi ke generator lain (rekursif di sini)."""
    for name, children in tree.items():
        yield name
        yield from walk(children)


# ---------------------------------------------------------------------------
# 3. Iterable class: cukup __iter__ (dan __len__ kalau perlu). Nggak perlu interface.
#    Ini duck typing: for-loop cuma butuh objek yang punya __iter__.
# ---------------------------------------------------------------------------
class Playlist:
    def __init__(self, *songs: str) -> None:
        self._songs = list(songs)

    def __iter__(self) -> Iterator[str]:
        yield from self._songs  # __iter__ sebagai generator: 1 baris

    def __len__(self) -> int:
        return len(self._songs)

    def __contains__(self, song: str) -> bool:  # bikin `x in playlist` jalan
        return song in self._songs


# ---------------------------------------------------------------------------
# 4. Bawaan yang sering bikin kode Java-style jadi 1 baris.
# ---------------------------------------------------------------------------
def word_count(text: str) -> list[tuple[str, int]]:
    return Counter(text.lower().split()).most_common(3)


def group_by_length(words: Iterable[str]) -> dict[int, list[str]]:
    groups: defaultdict[int, list[str]] = defaultdict(list)  # nggak perlu cek key ada atau nggak
    for w in words:
        groups[len(w)].append(w)
    return dict(groups)


def runs(values: Iterable[str]) -> list[tuple[str, int]]:
    """groupby cuma ngelompokin elemen yang BERURUTAN (beda sama SQL GROUP BY)."""
    return [(k, len(list(g))) for k, g in groupby(values)]


def first_n_fib_below(limit: int) -> list[int]:
    return list(takewhile(lambda x: x < limit, fibonacci()))


def chunks(items: Iterable[int], size: int) -> list[tuple[int, ...]]:
    return list(batched(items, size, strict=False))  # 3.12+, buat batch insert / paging


def deltas(xs: Iterable[int]) -> list[int]:
    return [b - a for a, b in pairwise(xs)]


def take(n: int, it: Iterable) -> list:
    return list(islice(it, n))


def merge(*lists: Iterable[int]) -> list[int]:
    return sorted(chain(*lists))


def numbered(items: Iterable[str]) -> list[str]:
    # enumerate + zip: nggak ada lagi `for (int i = 0; i < n; i++)`
    return [f"{i}. {item}" for i, item in enumerate(items, start=1)]


def to_dict(keys: Iterable[str], values: Iterable[int]) -> dict[str, int]:
    return dict(zip(keys, values, strict=True))  # strict=True: panjang beda -> ValueError


if __name__ == "__main__":
    print(even_squares(range(10)), take(10, fibonacci()), word_count("a b a c b a"))
    print(list(walk({"src": {"main": {}, "test": {}}, "README": {}})))
