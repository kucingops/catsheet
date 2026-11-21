# 04 · Security: banyak cara login dalam satu app

Semua konfigurasi ada di `src/Catsheet.Api/Security/SecurityExtensions.cs` (anggap saja `SecurityConfig` versi Spring).

## Konsep dasar

| Spring Security | ASP.NET Core |
|---|---|
| `SecurityFilterChain` | Middleware `UseAuthentication()` + `UseAuthorization()` |
| `AuthenticationProvider` / filter per jenis login | **Authentication scheme** + `AuthenticationHandler<TOptions>` |
| `Authentication` / `SecurityContextHolder` | `ClaimsPrincipal` di `HttpContext.User` |
| `GrantedAuthority` | `Claim` (role = claim bertipe `ClaimTypes.Role`) |
| `@PreAuthorize("hasRole('ADMIN')")` | `[Authorize(Roles = "Admin")]` / `.RequireAuthorization(policy)` |
| `AuthorizationManager` custom | `IAuthorizationRequirement` + `AuthorizationHandler<T>` |
| `permitAll()` | `.AllowAnonymous()` |
| `anyRequest().authenticated()` | `SetFallbackPolicy(RequireAuthenticatedUser)` |
| `UserDetailsService` + `PasswordEncoder` | `IUserStore` (custom) + `PasswordHasher<T>` (PBKDF2) |

**Authentication** = siapa kamu (401 kalau gagal). **Authorization** = boleh apa (403 kalau ditolak). Urutan middleware penting: `UseAuthentication()` harus sebelum `UseAuthorization()`.

## 5 scheme yang dipasang

| Scheme | Cara pakai | Stateful? | Cocok untuk | File |
|---|---|---|---|---|
| `Cookie` | `POST /auth/cookie/login` → server set cookie `catsheet.auth` | Ya (cookie terenkripsi Data Protection) | Web app server-rendered, BFF | bawaan `AddCookie` |
| `Basic` | Header `Authorization: Basic base64(user:pass)` | Tidak | Tool internal, demo. Wajib HTTPS. | `BasicAuthenticationHandler.cs` (custom) |
| `Bearer` (JWT) | `POST /auth/token` → `Authorization: Bearer <jwt>` | Tidak | SPA, mobile, service-to-service | `JwtTokenService.cs` + `AddJwtBearer` |
| `ApiKey` | Header `X-Api-Key: ...` | Tidak | Machine-to-machine (CI bot, partner) | `ApiKeyAuthenticationHandler.cs` (custom) |
| `Smart` | Otomatis | n/a | **Policy scheme**: lihat header lalu forward ke scheme di atas | `AddPolicyScheme` |

`Smart` dijadikan default, jadi endpoint biasa menerima keempat cara login. Kalau mau mengunci satu endpoint ke satu scheme:

```csharp
[Authorize(AuthenticationSchemes = AuthSchemes.Basic)]           // MeController.BasicOnly
[Authorize(AuthenticationSchemes = AuthSchemes.Jwt, Roles = Roles.Admin)] // MeController.JwtAdmin
```

Spring padanannya: beberapa `SecurityFilterChain` dengan `securityMatcher` berbeda.

## User demo

| User | Password | Role | Permission |
|---|---|---|---|
| alice | alice123 | Admin, User | catalog:write, order:checkout |
| bob | bob123 | User | order:checkout |
| API key `dev-api-key-123` | | Service | catalog:write |

## Authorization: role vs policy vs permission

```csharp
.AddPolicy(Policies.AdminOnly,       p => p.RequireRole(Roles.Admin))
.AddPolicy(Policies.CanWriteCatalog, p => p.AddRequirements(new PermissionRequirement("catalog:write")))
```

- **Role-based**: sederhana tapi kasar. `DELETE /api/products/{id}` cuma Admin.
- **Policy + custom requirement**: `PermissionHandler` meloloskan kalau user punya claim `permission=catalog:write` **atau** role Admin. Hasilnya API key `ci-bot` (role `Service`, bukan Admin) tetap bisa `POST /api/products`. Ada test-nya.
- **Fallback policy**: endpoint yang lupa diberi atribut tetap wajib login (secure by default). Endpoint publik harus eksplisit `.AllowAnonymous()` (`/health`, `/auth/*`, `/api/orders/quote`).
- **Resource-based** (belum ada di repo): `IAuthorizationService.AuthorizeAsync(user, resource, requirement)`. Contohnya "hanya pemilik order yang boleh lihat order-nya". Padanan `@PostAuthorize` / ACL.

## Hal yang sering ditanya

- **JWT vs session cookie?** JWT stateless dan gampang lintas service, tapi susah di-revoke sebelum expire. Solusinya: masa hidup pendek + refresh token, atau denylist. Cookie session gampang di-revoke tapi perlu state/sticky atau shared store, dan rawan CSRF.
- **CSRF**: relevan untuk cookie. Di repo ini cookie `SameSite=Strict` + `HttpOnly`. Untuk form HTML beneran aktifkan antiforgery (`AddAntiforgery` / `[ValidateAntiForgeryToken]`). Bearer token di header tidak kena CSRF.
- **Kenapa cookie API di-set balas 401/403?** Default cookie handler me-redirect ke `/Account/Login` (cocok untuk MVC, tidak cocok untuk API). Lihat `OnRedirectToLogin`.
- **`MapInboundClaims = false`**: kalau tidak, handler JWT me-rename claim pendek (`sub`, `role`) jadi URI panjang ala WS-Fed.
- **API key dibandingkan dengan `CryptographicOperations.FixedTimeEquals`** untuk cegah timing attack. Di production, simpan **hash** API key, bukan plain text.
- **Secret** (`Jwt:SigningKey`) di `appsettings.json` cuma untuk dev. Production pakai User Secrets (lokal), environment variable, atau Key Vault/Secrets Manager.
- **OAuth2/OIDC login (Google, Entra ID, Keycloak)**: belum dipasang karena butuh client secret. Polanya sama, tinggal tambah scheme:
  ```csharp
  .AddOpenIdConnect("oidc", o => {
      o.Authority = "https://accounts.google.com";
      o.ClientId = config["Oidc:ClientId"];
      o.ClientSecret = config["Oidc:ClientSecret"];
      o.ResponseType = "code";            // authorization code + PKCE
      o.SignInScheme = AuthSchemes.Cookie; // hasil login disimpan di cookie
  });
  ```
- **ASP.NET Core Identity** = paket lengkap (user table EF Core, lockout, 2FA, reset password, `MapIdentityApi`). Repo ini sengaja tidak pakai, supaya mekanisme scheme/handler kelihatan jelas. Analoginya: Identity itu Spring Security + Spring Data user store yang sudah jadi.

## Coba manual (`dotnet run --project src/Catsheet.Api`)

```bash
# Basic
curl -u alice:alice123 localhost:5080/api/me
# JWT
TOKEN=$(curl -s -H 'Content-Type: application/json' -d '{"username":"bob","password":"bob123"}' localhost:5080/auth/token | jq -r .accessToken)
curl -H "Authorization: Bearer $TOKEN" localhost:5080/api/me
# API key
curl -H 'X-Api-Key: dev-api-key-123' localhost:5080/api/me
# Cookie
curl -c jar.txt -H 'Content-Type: application/json' -d '{"username":"bob","password":"bob123"}' localhost:5080/auth/cookie/login
curl -b jar.txt localhost:5080/api/me
```
Ada juga `src/Catsheet.Api/Catsheet.Api.http` untuk VS Code / Rider / Visual Studio.
