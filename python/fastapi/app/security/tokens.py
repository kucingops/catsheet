"""JWT (stateless). Setara JwtEncoder/JwtDecoder di Spring Security OAuth2 Resource Server.

Poin interview:
- JWT itu di-SIGN, bukan di-ENCRYPT. Payload cuma base64, siapa pun bisa baca.
  Jangan taruh data sensitif di claim.
- Selalu tentukan `algorithms=[...]` saat decode (cegah serangan alg=none / alg confusion).
- Stateless -> nggak bisa "logout" token secara langsung. Solusinya: TTL pendek +
  refresh token, atau denylist `jti` di Redis.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt

from app.domain.models import Role, User


class InvalidToken(Exception):
    pass


@dataclass(frozen=True)
class TokenService:
    secret: str
    algorithm: str = "HS256"
    ttl: timedelta = timedelta(minutes=30)
    issuer: str = "catsheet-python"

    def issue(self, user: User, *, now: datetime | None = None) -> str:
        now = now or datetime.now(UTC)
        claims = {
            "sub": user.username,
            "roles": sorted(user.roles),
            "iss": self.issuer,
            "iat": now,
            "exp": now + self.ttl,
            "jti": uuid.uuid4().hex,
        }
        return jwt.encode(claims, self.secret, algorithm=self.algorithm)

    def parse(self, token: str) -> tuple[str, frozenset[Role]]:
        try:
            claims = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                issuer=self.issuer,
                options={"require": ["exp", "sub", "iss"]},
            )
        except jwt.ExpiredSignatureError as e:
            raise InvalidToken("token expired") from e
        except jwt.InvalidTokenError as e:
            raise InvalidToken("token tidak valid") from e
        return claims["sub"], frozenset(Role(r) for r in claims.get("roles", []))
