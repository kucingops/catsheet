# 06 · DI, konfigurasi, middleware (Spring core versi .NET)

## Dependency Injection

Container bawaan (`Microsoft.Extensions.DependencyInjection`). Tidak ada component scan. Semua didaftarkan eksplisit di `Program.cs` atau extension method (`AddCatsheetSecurity`, `AddCatsheetPersistence`).

| Lifetime | Artinya | Spring |
|---|---|---|
| `AddSingleton` | 1 instance seumur app | `@Scope("singleton")` (default Spring) |
| `AddScoped` | 1 instance per HTTP request (per scope) | `@RequestScope` |
| `AddTransient` | Instance baru setiap di-inject | `@Scope("prototype")` |

**Captive dependency**: Singleton yang meng-inject Scoped (misal `DbContext`). Si Scoped "tertawan" seumur app: tidak thread-safe dan data basi. Di environment Development, container langsung melempar exception (`ValidateScopes`). Solusinya: jadikan Scoped juga, atau inject `IServiceScopeFactory` dan bikin scope sendiri. Contohnya di `InitializeDatabaseAsync`, yang memakai `CreateAsyncScope()`.

Kenapa di repo ini `AdoProductRepository` Singleton tapi `EfProductRepository` Scoped? Yang ADO stateless (cuma memegang connection string). Yang EF memegang `DbContext`.

Injection style:
- Constructor (primary constructor C# 12): `CatalogService(IProductRepository products, ILogger<CatalogService> logger)`.
- Parameter minimal API: `(CatalogService svc, CancellationToken ct) => ...`. Framework yang mengisi.
- Tidak ada field injection (`@Autowired` di field). Itu bagus.

## Konfigurasi & Options

- Sumber (yang belakangan menang): `appsettings.json` → `appsettings.{Environment}.json` → User Secrets (dev) → environment variable → argumen command line. Mirip property source di Spring.
- Env var: `Persistence__Provider=Ado` (dua underscore = `:`), padanan `PERSISTENCE_PROVIDER`.
- Bind ke class: `config.GetSection("Jwt").Get<JwtOptions>()` ≈ `@ConfigurationProperties`. Untuk reload dan validasi pakai `IOptions<T>` / `IOptionsMonitor<T>` + `ValidateOnStart()`.
- Environment: `ASPNETCORE_ENVIRONMENT=Development|Staging|Production` ≈ Spring profile.

## Middleware pipeline

Request mengalir lewat middleware sesuai **urutan pendaftaran** (seperti filter chain):

```
UseExceptionHandler → UseStatusCodePages → UseAuthentication → UseAuthorization → endpoint
```

- `IExceptionHandler` (`Errors/DomainExceptionHandler.cs`) ≈ `@RestControllerAdvice`. Mengubah `DomainException` jadi 400 dan `KeyNotFoundException` jadi 404, dalam format **ProblemDetails (RFC 9457)**. Spring 6 juga pakai format ini.
- Bikin middleware sendiri: `app.Use(async (ctx, next) => { ...; await next(ctx); ... })`.
- **Filter** (endpoint filter / MVC action filter) ≈ `HandlerInterceptor` / AOP around advice, tapi hanya untuk endpoint tertentu.

## Minimal API vs Controller

| | Minimal API (`Endpoints/*`) | Controller (`Controllers/MeController.cs`) |
|---|---|---|
| Gaya | Lambda + route group | Class + attribute, mirip `@RestController` |
| Overhead | Lebih ringan, ramah Native AOT | Fitur lengkap (model binding kompleks, filter MVC) |
| Validasi | `AddValidation()` (.NET 10+) membaca DataAnnotations | `[ApiController]` otomatis 400 |

Keduanya bisa hidup dalam satu app, seperti di repo ini.

## Async & CancellationToken
Semua I/O `async`. `CancellationToken` diteruskan dari endpoint sampai ke query DB. Kalau client memutus koneksi, query ikut dibatalkan. Di Java/Spring MVC tradisional hal ini jarang dibahas, padahal ini kebiasaan baku di .NET.
