# Gin REST API: multi login, multi persistence, desain ala Go, testing

API notes sederhana yang sengaja dibuat untuk pamer tiga hal sekaligus: beberapa cara login hidup berdampingan, data bisa disimpan dengan atau tanpa database, dan semuanya di-test.

Lapisan (dari luar ke dalam):

```
HTTP request
  → httpapi (Gin route + handler)        ~ @RestController
  → auth middleware                       ~ SecurityFilterChain
  → service.NoteService                   ~ @Service
  → store.NoteRepository (interface)      ~ Spring Data repository
       ├─ MemoryNoteRepository            tanpa persistence
       ├─ FileNoteRepository              file JSON
       └─ SQLNoteRepository               SQLite via database/sql
```

`domain` di tengah tidak import Gin, database, atau auth. Semua panah dependensi mengarah ke dalam.

## Coba jalankan

```bash
cd go
go run ./gin/cmd/server                  # in-memory
STORE=sqlite go run ./gin/cmd/server     # notes.db
STORE=file   go run ./gin/cmd/server     # notes.json
```

User bawaan: `budi/budi123`, `siti/siti123` (USER), `admin/admin123` (USER+ADMIN). API key: `demo-reporting-key` (ADMIN).

```bash
# 1. HTTP Basic
curl -u budi:budi123 localhost:8080/api/basic/notes -d '{"title":"halo"}'

# 2. Form login + session cookie
curl -c jar.txt -d 'username=budi&password=budi123' localhost:8080/auth/session/login
curl -b jar.txt localhost:8080/api/session/notes

# 3. JWT
TOKEN=$(curl -s localhost:8080/auth/jwt/token -d '{"username":"admin","password":"admin123"}' | jq -r .accessToken)
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/admin/stats

# 4. API key
curl -H 'X-API-Key: demo-reporting-key' localhost:8080/api/admin/stats

# Siapa saya, dan login lewat apa?
curl -u budi:budi123 localhost:8080/api/me
```

## Security

### Peta route

| Path | Metode login yang diterima | Syarat tambahan |
|---|---|---|
| `/health` | publik | |
| `/auth/session/login`, `/auth/jwt/token` | publik (ini tempat login) | |
| `/api/basic/*` | HTTP Basic | |
| `/api/session/*` | cookie `SESSION` | |
| `/api/jwt/*` | `Authorization: Bearer` | |
| `/api/*` | JWT, session, Basic, atau API key | |
| `/api/admin/*` | JWT atau API key | role `ADMIN` |

Di Spring ini butuh beberapa `SecurityFilterChain` bean dengan `securityMatcher` dan `@Order`. Di Gin cukup route group yang dipasangi middleware berbeda ([router.go](internal/httpapi/router.go)).

### Desainnya

Setiap metode login memenuhi satu interface ([auth.go](internal/auth/auth.go)):

```go
type Authenticator interface {
    Name() string
    Authenticate(r *http.Request) (Principal, error)
}
```

Middleware `auth.Authenticate(a1, a2, ...)` mencoba satu per satu. Kalau authenticator bilang `ErrNoCredentials` ("request ini bukan urusanku"), lanjut ke berikutnya. Kalau bilang `ErrBadCredentials`, langsung 401 tanpa fallback. Ini Strategy pattern + Chain of Responsibility, dan inilah polymorphism yang nyata di aplikasi.

Logika autentikasi cuma bergantung ke `*http.Request`, jadi bisa di-test tanpa Gin dan bisa dipindah ke `net/http` murni, Echo, atau Chi. Yang terikat ke Gin cuma `middleware.go`.

### Perbandingan metode

| | Basic | Session | JWT | API key |
|---|---|---|---|---|
| State di server | tidak | ya (session store) | tidak | daftar key |
| Kredensial dikirim | user+pass tiap request | cookie berisi ID acak | token bertanda tangan | key statis |
| Logout / revoke | tidak ada konsep logout | instan (hapus session) | susah; tunggu expired atau denylist | hapus key |
| Cocok untuk | tool internal, testing | web app server-rendered | SPA, mobile, microservice | service-to-service |
| Risiko utama | password bocor kalau tanpa HTTPS | CSRF, session hijack | token dicuri, alg confusion | key bocor di repo/log |
| Mitigasi di kode ini | bcrypt, timing-safe | HttpOnly, SameSite=Strict, Secure, ID baru tiap login, sliding expiry | `WithValidMethods(HS256)`, issuer, exp wajib, TTL 15 menit | disimpan sebagai hash SHA-256 |

Detail kecil yang sering jadi bahan diskusi:

- **Timing attack di login.** Kalau username tidak ada, kode tetap menjalankan bcrypt terhadap hash dummy, supaya waktu respons "user tidak ada" dan "password salah" sama ([auth.go](internal/auth/auth.go)).
- **401 vs 403.** 401 = belum dikenali, 403 = dikenali tapi tidak boleh. `RequireRole` mengembalikan 403; `Authenticate` mengembalikan 401 plus header `WWW-Authenticate` kalau Basic diterima.
- **Authorization berlapis.** Role dicek di middleware (`RequireRole`), dan aturan kepemilikan data dicek lagi di service (`Actor.CanAccess`). Mirip `.hasRole()` di filter chain plus `@PreAuthorize` di service.
- **Yang belum ada (sengaja, biar fokus):** refresh token, OAuth2/OIDC login (pakai `golang.org/x/oauth2` atau `coreos/go-oidc`), CSRF token untuk form, rate limiting login.

## Persistence

Satu interface, tiga implementasi ([store.go](internal/store/store.go)). Pilih lewat env `STORE` di `main.go`:

| Implementasi | Disimpan di | Restart | Catatan |
|---|---|---|---|
| `MemoryNoteRepository` | `map` + `sync.RWMutex` | data hilang | paling cepat, cocok untuk test & prototipe |
| `FileNoteRepository` | file JSON | selamat | embed memory repo, tulis atomic (temp file + rename) |
| `SQLNoteRepository` | SQLite (`database/sql`) | selamat | SQL mentah, transaksi, migrasi sederhana |

Java vs Go:

| Java / Spring | Go |
|---|---|
| JDBC + HikariCP | `database/sql` (`sql.DB` itu sudah connection pool) |
| `JdbcTemplate` | `database/sql` langsung, atau `sqlx` |
| JPA / Hibernate | GORM, ent (ORM); tapi komunitas Go cenderung SQL eksplisit |
| Spring Data generate query | `sqlc`: tulis SQL, generate kode Go yang type-safe |
| `@Transactional` | `tx, _ := db.BeginTx(ctx, nil); defer tx.Rollback(); ...; tx.Commit()` |
| Flyway / Liquibase | golang-migrate, goose, atlas |
| `EmptyResultDataAccessException` | `sql.ErrNoRows`, diterjemahkan ke `domain.ErrNotFound` |

Contoh transaksi ada di `SQLNoteRepository.TransferOwnership` ([sql.go](internal/store/sql.go)). Pola `defer tx.Rollback()` aman karena setelah `Commit` sukses, `Rollback` jadi no-op.

Hal yang wajib diingat dengan `database/sql`:

- Selalu pakai placeholder (`?` di SQLite/MySQL, `$1` di Postgres). Jangan `fmt.Sprintf` ke query.
- `rows.Close()` wajib (pakai `defer`), dan cek `rows.Err()` setelah loop. Lupa close = koneksi bocor dari pool.
- Teruskan `ctx` ke `QueryContext`/`ExecContext`, supaya query ikut batal kalau client memutus request.

## Testing

```bash
go test ./...                                    # semua
go test -race ./...                              # deteksi data race
go test -run TestSessionFlow -v ./gin/...        # satu test
go test -bench=. -benchmem ./gin/internal/store  # benchmark
go test -fuzz=FuzzNoteValidate ./gin/internal/domain   # fuzzing
go test -coverprofile=c.out ./... && go tool cover -html=c.out
```

| Teknik | Padanan Java | Contoh |
|---|---|---|
| Table-driven test + `t.Run` | `@ParameterizedTest` | hampir semua file `_test.go` |
| Contract test untuk semua implementasi interface | abstract test class | [storetest/contract.go](internal/store/storetest/contract.go) |
| Fake: pakai implementasi in-memory asli | `@MockBean` dengan stub | [service/notes_test.go](internal/service/notes_test.go) |
| Mock manual dengan embed interface | `Mockito.mock()` + `thenThrow` | `failingRepo` di service test |
| Stub authenticator | mock `AuthenticationProvider` | [auth/middleware_test.go](internal/auth/middleware_test.go) |
| `httptest.NewServer` end-to-end | `@SpringBootTest(RANDOM_PORT)` | [httpapi/router_test.go](internal/httpapi/router_test.go) |
| `testing/synctest` (jam palsu) | `Clock` yang di-inject / Awaitility | [auth/session_test.go](internal/auth/session_test.go) |
| Inject `now func() time.Time` | inject `java.time.Clock` | `NoteService`, `JWTIssuer` |
| `t.TempDir()`, `t.Cleanup()` | `@TempDir`, `@AfterEach` | store tests |
| Black-box test (`package store_test`) | test di package lain | store tests |
| Example function (`// Output:`) | tidak ada padanan langsung | core/idiomatic iter_test.go |
| Fuzz test | jqwik / property-based | domain/domain_test.go |
| Benchmark `b.Loop()` | JMH | store/memory_test.go |

Kenapa tanpa testify/gomock? Biar kelihatan bahwa `testing` bawaan sudah cukup. Di tim nyata, `testify/require` dan `go.uber.org/mock` (mockgen) sangat umum dan boleh-boleh saja.
