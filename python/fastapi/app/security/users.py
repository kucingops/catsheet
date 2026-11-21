"""User store + autentikasi username/password. Setara UserDetailsService + AuthenticationProvider."""

import hashlib
import secrets

from app.domain.models import Role, User
from app.security.passwords import DUMMY_HASH, hash_password, verify_password


def hash_api_key(raw: str) -> str:
    """API key disimpan dalam bentuk hash (SHA-256 cukup karena key-nya random & panjang,
    beda dengan password manusia yang butuh hash lambat seperti Argon2)."""
    return hashlib.sha256(raw.encode()).hexdigest()


class UserStore:
    """In-memory biar fokus ke security. Di dunia nyata ini repository ke tabel users."""

    def __init__(self) -> None:
        self._by_name: dict[str, User] = {}

    def add(self, username: str, password: str, *roles: Role, api_key: str | None = None) -> User:
        user = User(
            username=username,
            password_hash=hash_password(password),
            roles=frozenset(roles or {Role.USER}),
            api_key=hash_api_key(api_key) if api_key else None,
        )
        self._by_name[username] = user
        return user

    def find(self, username: str) -> User | None:
        return self._by_name.get(username)

    def authenticate(self, username: str, password: str) -> User | None:
        user = self.find(username)
        if user is None:
            verify_password(password, DUMMY_HASH)  # samakan timing
            return None
        return user if verify_password(password, user.password_hash) else None

    def find_by_api_key(self, raw_key: str) -> User | None:
        digest = hash_api_key(raw_key)
        for user in self._by_name.values():
            # compare_digest = constant-time comparison (hindari timing attack)
            if user.api_key and secrets.compare_digest(user.api_key, digest):
                return user
        return None


def seeded_user_store() -> UserStore:
    """User demo. Password & API key sengaja ditulis di sini karena ini cheatsheet."""
    store = UserStore()
    store.add("alice", "alice123", Role.USER, api_key="alice-api-key")
    store.add("bob", "bob123", Role.USER)
    store.add("admin", "admin123", Role.USER, Role.ADMIN, api_key="admin-api-key")
    return store
