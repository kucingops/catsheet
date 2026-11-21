"""Context manager (`with`) dan error handling gaya Python (EAFP).

Jalankan: uv run python -m pythonic.resources

Kalau dari Java: `with` = try-with-resources, tapi protokolnya lebih umum. Bukan cuma
buat close(), bisa buat lock, transaksi, timer, ganti direktori, patch sementara, dst.
"""

import os
from collections.abc import Iterator
from contextlib import ExitStack, contextmanager, suppress
from pathlib import Path


# ---------------------------------------------------------------------------
# 1. Cara paling gampang bikin context manager: generator + @contextmanager.
#    Kode sebelum yield = setup (__enter__), setelah yield = teardown (__exit__).
# ---------------------------------------------------------------------------
@contextmanager
def transaction(log: list[str]) -> Iterator[list[str]]:
    log.append("BEGIN")
    try:
        yield log
    except Exception:
        log.append("ROLLBACK")
        raise  # jangan telan exception
    else:
        log.append("COMMIT")


@contextmanager
def working_dir(path: Path) -> Iterator[Path]:
    old = Path.cwd()
    os.chdir(path)
    try:
        yield path
    finally:
        os.chdir(old)  # selalu balik, walau error


# ---------------------------------------------------------------------------
# 2. Versi class: __enter__ / __exit__. Pakai kalau objeknya memang punya state
#    dan dipakai di luar `with` juga (mis. koneksi DB, lock).
# ---------------------------------------------------------------------------
class Connection:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn
        self.closed = False

    def close(self) -> None:
        self.closed = True

    def __enter__(self) -> Connection:
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        self.close()
        return False  # False = exception (kalau ada) tetap dilempar


def open_all(dsns: list[str]) -> list[Connection]:
    """ExitStack: jumlah resource dinamis. Kalau yang ke-3 gagal dibuka,
    yang ke-1 dan ke-2 otomatis ditutup. Susah ditiru pakai try-with-resources."""
    with ExitStack() as stack:
        conns = [stack.enter_context(Connection(d)) for d in dsns]
        if any(not d for d in dsns):
            raise ValueError("dsn kosong")
        stack.pop_all()  # sukses semua -> serahkan ownership ke caller, jangan ditutup
        return conns


# ---------------------------------------------------------------------------
# 3. EAFP vs LBYL
#    LBYL (Look Before You Leap): cek dulu baru jalan. Gaya Java/C.
#    EAFP (Easier to Ask Forgiveness than Permission): langsung jalan, tangkap error.
#    Python lebih suka EAFP: lebih pendek dan aman dari race condition
#    (file bisa dihapus di antara `exists()` dan `open()`).
# ---------------------------------------------------------------------------
def port_lbyl(config: dict) -> int:
    if "port" in config and isinstance(config["port"], str) and config["port"].isdigit():
        return int(config["port"])
    return 8080


def port_eafp(config: dict) -> int:
    try:
        return int(config["port"])
    except KeyError, ValueError, TypeError:  # 3.14 (PEP 758): kurung boleh dihilangkan
        return 8080


def read_or_default(path: Path, default: str = "") -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return default


def remove_if_exists(path: Path) -> None:
    with suppress(FileNotFoundError):  # "abaikan error ini", lebih jelas dari try/except: pass
        path.unlink()


# ---------------------------------------------------------------------------
# 4. Exception sendiri: cukup subclass Exception, nggak ada checked exception.
#    `raise ... from e` = exception chaining (kayak `new X(msg, cause)` di Java).
# ---------------------------------------------------------------------------
class ConfigError(Exception):
    pass


def load_port(raw: str) -> int:
    try:
        port = int(raw)
    except ValueError as e:
        raise ConfigError(f"port bukan angka: {raw!r}") from e
    if not 0 < port < 65536:
        raise ConfigError(f"port di luar range: {port}")
    return port


def parse_all(raws: list[str]) -> list[int]:
    """ExceptionGroup (3.11+): kumpulkan banyak error sekaligus, ditangkap pakai except*."""
    errors, ports = [], []
    for raw in raws:
        try:
            ports.append(load_port(raw))
        except ConfigError as e:
            errors.append(e)
    if errors:
        raise ExceptionGroup("config tidak valid", errors)
    return ports


if __name__ == "__main__":
    log: list[str] = []
    with transaction(log):
        pass
    print(log, port_eafp({"port": "abc"}))
