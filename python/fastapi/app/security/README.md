# Security: multiple login di FastAPI

Kode: [`authenticators.py`](authenticators.py), [`tokens.py`](tokens.py), [`users.py`](users.py),
[`passwords.py`](passwords.py), dependency di [`../api/deps.py`](../api/deps.py).

FastAPI **nggak punya** framework security sebesar Spring Security. Yang ada cuma helper
(`HTTPBasic`, `OAuth2PasswordBearer`, `APIKeyHeader`) yang ngambil kredensial dari request dan
masukin ke OpenAPI. Sisanya (verifikasi, user lookup, role) kita tulis sendiri. Makanya bagus buat
nunjukin kita paham konsepnya, bukan cuma hafal anotasi.

## Desain

Authenticator itu cuma tipe fungsi: `type Authenticator = Callable[[Request], User | None]`.

```
basic(users)              -> Authorization: Basic base64(user:pass)
api_key(users)            -> X-API-Key: ...
bearer_jwt(users, tokens) -> Authorization: Bearer <jwt>
session(users)            -> cookie "session" (signed)
first_match(*auths)       -> coba berurutan (kayak ProviderManager / filter chain)
```

Tiap fungsi di atas adalah *factory* yang mengembalikan closure. Dependency (`users`, `tokens`)
"diingat" closure, jadi nggak perlu class + constructor + field. Kalau dari Java: interface
dengan satu method (`AuthenticationProvider`) di Python cukup callable, dan Composite cukup
fungsi yang nerima banyak callable. Di test, authenticator palsu cukup `lambda _: user`.

Kontrak `authenticate(request)`:

- return `User` → sukses
- return `None` → header-nya nggak ada, "bukan urusan saya", coba yang lain
- raise `AuthError` → kredensial **ada tapi salah** → stop, langsung 401 (jangan fallback, nanti
  attacker bisa nyelipin header lain)

Per endpoint tinggal pilih dependency, mirip punya beberapa `SecurityFilterChain`:

| Endpoint | Dependency | Terima |
|---|---|---|
| `/whoami/basic` | `basic_user` | Basic saja |
| `/whoami/api-key` | `api_key_user` | API key saja |
| `/whoami/jwt` | `jwt_user` | JWT saja |
| `/whoami/session` | `session_user` | cookie session saja |
| `/notes/**`, `/whoami/any` | `any_user` | semuanya (urutan: JWT → API key → session → Basic) |
| `/admin/**` | `require_role(Role.ADMIN)` | semuanya + wajib role admin |

## Perbandingan 4 metode

| | Basic | API key | JWT | Session cookie |
|---|---|---|---|---|
| State di server | nggak | nggak (tapi lookup DB) | nggak | tergantung (Starlette: di cookie; Spring: di server) |
| Kirim rahasia tiap request | password | key | token (expire) | session id/cookie |
| Revoke | ganti password | hapus key | susah (TTL pendek, denylist `jti`) | hapus session |
| Cocok untuk | tooling internal | machine/partner | SPA, mobile, microservice | web app server-rendered |
| Risiko khas | password bocor di log | key bocor di repo | XSS kalau disimpan di localStorage, alg confusion | CSRF |

## Hal yang sengaja ditunjukin di kode

- **Argon2id** via `pwdlib` buat password (lambat by design). API key cukup SHA-256 karena udah random
  dan panjang.
- **Constant-time compare** (`secrets.compare_digest`) buat API key.
- **Anti user-enumeration**: kalau username nggak ada, tetap jalanin `verify` ke dummy hash supaya
  waktu respon sama.
- **JWT**: `algorithms=[...]` wajib saat decode (test `alg=none` ditolak), cek `iss` & `exp`, ada `jti`.
  JWT itu **signed, bukan encrypted**; ada test yang buktiin payload bisa dibaca tanpa secret.
- **Load ulang user dari store** setelah verifikasi JWT, supaya user yang dihapus langsung ditolak.
  Trade-off: jadi nggak 100% stateless.
- **401 vs 403**: 401 = belum/gagal autentikasi (+ header `WWW-Authenticate`), 403 = udah login tapi
  nggak berhak.
- **404 untuk resource orang lain** (bukan 403), biar nggak bocorin bahwa ID itu ada.
- Session: `SameSite=Lax` sebagai proteksi dasar CSRF, `session.clear()` saat login (cegah session
  fixation), `https_only=True` di production.

## Yang belum ada di kode (cukup tahu konsepnya)

- **OAuth2 / OIDC login (Google, Keycloak)**: pakai `authlib` (`OAuth().register(...)`), flow
  Authorization Code + PKCE. Setelah callback, simpan user ke session atau terbitkan JWT sendiri.
- **Refresh token**: access token pendek (5 sampai 15 menit) + refresh token panjang yang disimpan di
  DB dan di-rotate tiap dipakai.
- **Scopes**: `Security(dep, scopes=["notes:write"])` + `SecurityScopes`, mirip `hasAuthority('SCOPE_x')`.
- **Rate limiting** endpoint login (`slowapi`) dan **CORS** (`CORSMiddleware`).
- **mTLS** biasanya di level reverse proxy / service mesh, bukan di app.

## Pertanyaan interview

1. Bedanya authentication vs authorization? Status code masing-masing?
2. Kenapa JWT susah di-logout? Solusinya?
3. Simpan JWT di localStorage atau cookie? (localStorage → rawan XSS; cookie `HttpOnly` → rawan CSRF,
   tangkal pakai `SameSite` + CSRF token)
4. Kenapa password harus pakai hash lambat (Argon2/bcrypt), bukan SHA-256?
5. HS256 vs RS256? (shared secret vs public/private key; RS256 cocok kalau banyak service cuma perlu
   verifikasi)
