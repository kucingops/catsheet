# Security: satu sumber user, empat cara login

```
                         +-------------------------+
 Authorization: Basic -->| Basic mechanism         |--+
 cookie quarkus-cred. -->| Form mechanism          |--+--> IdentityProvider --> SecurityIdentity
 Authorization: Bearer ->| JWT (smallrye-jwt)      |--+    (embedded users,      (principal + roles)
 X-API-Key ------------->| ApiKeyAuthentication... |--+     JWT verifier,              |
                         +-------------------------+        ApiKeyIdentityProvider)     v
                                                                           @RolesAllowed / permission
```

| Path | Mekanisme | Stateful? | Cocok untuk |
|---|---|---|---|
| `/api/basic/*` | HTTP Basic | Tidak, kirim password tiap request | Tool internal, test cepat. Wajib HTTPS |
| `/api/form/*` | Form login `POST /j_security_check` | Cookie terenkripsi (bukan HttpSession) | Web app server-rendered |
| `/api/jwt/*` | Bearer JWT dari `POST /api/auth/token` | Stateless | SPA, mobile, antar service |
| `/api/key/*` | Header `X-API-Key` (custom) | Stateless | Machine-to-machine, partner, bot |
| `/api/pets` | Semua mekanisme di atas | | Endpoint bisnis cuma peduli role |

Konfigurasi path -> mekanisme ada di `application.properties`:

```properties
quarkus.http.auth.permission.jwt.paths=/api/jwt/*
quarkus.http.auth.permission.jwt.policy=authenticated
quarkus.http.auth.permission.jwt.auth-mechanism=bearer
quarkus.http.auth.proactive=false
```

Alternatif lain: pilih mekanisme lewat annotation di resource method
(`@BasicAuthentication`, `@FormAuthentication`, dll.). Di sini sengaja pakai config supaya semua aturan kelihatan di satu file.

## Authentication vs Authorization

- **401 Unauthorized** = belum terautentikasi (siapa kamu?).
- **403 Forbidden** = sudah login, tapi role-nya tidak cukup.

Dites di `PetResourceTest.userWithoutAdminRoleIsForbidden` dan `LoginMechanismsTest`.

Authorization di project ini:
- `@PermitAll`, `@RolesAllowed("admin")`, `@Authenticated` (Quarkus) di resource.
- Path-based policy di `application.properties`.
- Lainnya yang perlu tahu: `@PermissionsAllowed("pet:adopt")` (permission granular), `@DenyAll`,
  `SecurityIdentityAugmentor` (tambah role dari DB setelah login).

## Proactive vs lazy authentication

Default Quarkus **proactive**: setiap request yang bawa credential langsung diautentikasi,
walau endpoint-nya publik. Di sini dimatikan (`proactive=false`) supaya autentikasi jalan setelah
path dicocokkan, jadi pembatasan mekanisme per path berlaku. Efek sampingnya: credential salah ke
endpoint `@PermitAll` tidak langsung 401.

## JWT

- Token ditandatangani **RSA private key** (`privateKey.pem`), diverifikasi pakai **public key**.
  Service lain cukup pegang public key untuk verifikasi, tidak bisa bikin token.
- Claim penting: `iss` (dicek `mp.jwt.verify.issuer`), `upn` (jadi principal name), `groups` (jadi role), `exp`.
- Stateless = tidak bisa logout paksa sebelum `exp`. Solusi: TTL pendek + refresh token, atau denylist `jti`.
- **Key di repo ini cuma untuk demo.** Production: simpan di secret manager / Vault, atau pakai OIDC provider (Keycloak) dengan `quarkus-oidc` dan biarkan provider yang menerbitkan token.

## Form login di Quarkus beda dengan Spring

Spring form login menyimpan `SecurityContext` di `HttpSession` (server-side). Quarkus menyimpan
identity di cookie `quarkus-credential` yang **dienkripsi** pakai `quarkus.http.auth.session.encryption-key`.
Server tetap stateless, jadi aman di-scale horizontal tanpa sticky session.

## Custom mechanism (API key)

Dua class, pisah tanggung jawab:

1. `ApiKeyAuthenticationMechanism implements HttpAuthenticationMechanism`: baca header,
   bungkus jadi `ApiKeyAuthenticationRequest`, serahkan ke `IdentityProviderManager`.
   Kalau header tidak ada, return `null` supaya mekanisme lain boleh coba.
2. `ApiKeyIdentityProvider implements IdentityProvider<ApiKeyAuthenticationRequest>`:
   cocokkan key (constant-time, `MessageDigest.isEqual`) dan bangun `SecurityIdentity`.

Padanan di Spring: `OncePerRequestFilter` / `AuthenticationFilter` + `AuthenticationProvider`.

## Password

Demo ini pakai `quarkus.security.users.embedded.plain-text=true`, **jangan di production**.
Pilihan nyata: `quarkus-security-jpa` (user di tabel, password `@Password` bcrypt),
`quarkus-elytron-security-jdbc`, LDAP, atau OIDC.

## Pertanyaan interview

1. *Session vs JWT?* Session: server simpan state, gampang revoke, perlu sticky session/shared store. JWT: stateless, gampang scale, susah revoke.
2. *Kenapa Basic wajib HTTPS?* Base64 itu encoding, bukan enkripsi.
3. *Di mana simpan JWT di browser?* Cookie `HttpOnly` + `Secure` + `SameSite` lebih aman dari XSS dibanding localStorage, tapi perlu proteksi CSRF.
4. *CSRF relevan kapan?* Saat credential dikirim otomatis oleh browser (cookie: form login). Bearer di header tidak rentan CSRF. Quarkus: `quarkus-rest-csrf`.
