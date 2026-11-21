"""Hash password. Setara PasswordEncoder di Spring Security.

pwdlib = library yang sekarang direkomendasikan docs FastAPI (pengganti passlib yang
sudah tidak di-maintain). `recommended()` = Argon2id, pemenang Password Hashing Competition.
Hash Argon2 sudah berisi salt + parameter, jadi nggak perlu simpan salt terpisah.
"""

from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()


def hash_password(raw: str) -> str:
    return _hasher.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return _hasher.verify(raw, hashed)


# Dipakai saat username tidak ditemukan: tetap jalanin verify supaya waktu respon
# sama -> attacker nggak bisa nebak username valid dari timing (user enumeration).
DUMMY_HASH = hash_password("dummy-password-for-timing")
