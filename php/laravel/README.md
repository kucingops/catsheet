# Laravel 13: multi-auth, persistence, OOP, testing

App Laravel kecil dengan satu resource (`Note`) yang dipakai untuk menunjukkan:

1. [Enam cara login dalam satu app](#1-enam-cara-login)
2. [Authorization: ability, Gate, Policy](#2-authorization)
3. [Tiga cara menyimpan data di balik satu interface](#3-persistence-tiga-cara-satu-interface)
4. [Jebakan ORM yang sering ditanya](#4-jebakan-eloquent)
5. [OOP di Laravel](#5-oop-di-laravel)
6. [Testing](#6-testing)
7. [Pertanyaan interview](#7-pertanyaan-interview)

```bash
composer install
php artisan test              # SQLite in-memory, tidak butuh DB server

# coba manual
cp .env.example .env && php artisan key:generate
touch database/database.sqlite && php artisan migrate
php artisan serve
```

## Struktur

```
app/
├── Auth/
│   ├── JwtGuard.php            # custom guard, implement Illuminate\Contracts\Auth\Guard
│   ├── JwtService.php          # issue/verify JWT HS256
│   └── PartnerApiKey.php       # guard closure untuk API key
├── Http/
│   ├── Controllers/
│   │   ├── Auth/               # SessionLogin, SanctumToken, JwtToken
│   │   ├── NoteController.php
│   │   └── WhoAmIController.php
│   └── Middleware/StatelessBasicAuth.php
├── Models/                     # User, Admin, Note (Eloquent)
├── Notes/
│   ├── NoteRepository.php      # interface
│   ├── EloquentNoteRepository.php
│   ├── QueryBuilderNoteRepository.php
│   ├── FileNoteRepository.php
│   ├── InMemoryNoteRepository.php   # fake untuk unit test
│   ├── NoteData.php            # DTO readonly, bebas dari Eloquent
│   └── NoteService.php         # aturan bisnis
├── Policies/NotePolicy.php
└── Providers/AppServiceProvider.php   # wiring: binding repository, guard custom, gate
config/auth.php                 # 4 guard + 2 provider
config/catsheet.php             # NOTES_DRIVER, JWT, API key partner
```

---

## 1. Enam cara login

Di Laravel, **guard** menentukan *cara* user dikenali di tiap request (session, token, header), sedangkan **provider** menentukan *dari mana* user diambil (tabel `users`, tabel `admins`, atau tidak dari DB sama sekali). Semua didefinisikan di [`config/auth.php`](config/auth.php). Di Spring, padanannya beberapa `SecurityFilterChain` dengan `AuthenticationProvider` berbeda.

| # | Jenis | Guard | Endpoint | State | Cocok untuk |
|---|---|---|---|---|---|
| 1 | Session + cookie | `web` | `POST /login`, `GET /dashboard` | Stateful (session) | Web app server-rendered |
| 2 | Session admin terpisah | `admin` | `POST /admin/login`, `GET /admin/dashboard` | Stateful | Back-office, tabel & session sendiri |
| 3 | Sanctum personal access token | `sanctum` | `POST /api/sanctum/token`, `GET /api/sanctum/me` | Token opaque, hash di DB | Mobile app, CLI, API pihak ketiga |
| 4 | HTTP Basic | (pakai provider `users`) | `GET /api/basic/me` | Stateless | Tool internal, script cepat |
| 5 | JWT | `jwt` (custom) | `POST /api/jwt/token`, `GET /api/jwt/me` | Stateless, tidak ada di DB | Antar service, SSO |
| 6 | API key | `partner` (custom) | `GET /api/partner/me` | Stateless, tanpa DB | Machine to machine |

Plus satu route yang menerima dua jenis token: `GET /api/me` dengan `auth:sanctum,jwt`. Middleware `auth` mencoba guard satu per satu, guard pertama yang berhasil jadi guard default untuk request itu.

### 1. Session (`web`)

[`SessionLoginController`](app/Http/Controllers/Auth/SessionLoginController.php):

```php
if (! Auth::guard($guard)->attempt($credentials, $request->boolean('remember'))) {
    throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
}
$request->session()->regenerate();   // cegah session fixation
```

Logout wajib `invalidate()` session dan `regenerateToken()` CSRF. Route login di-`throttle:5,1` (5 percobaan per menit).

### 2. Guard admin terpisah

Controller yang sama dipakai ulang. Route admin mengirim `->defaults('guard', 'admin')`, controller membaca nama guard dari route. Provider `admins` menunjuk ke model [`Admin`](app/Models/Admin.php) dan tabel `admins`. Hasilnya:

- Kredensial user tidak bisa dipakai login admin, dan sebaliknya.
- Login admin tidak bikin user ter-login di guard `web`.
- Tamu yang buka `/admin/*` di-redirect ke `/admin/login`, sisanya ke `/login` (lihat `redirectGuestsTo` di [`bootstrap/app.php`](bootstrap/app.php)).

### 3. Sanctum

Token dibuat dengan `$user->createToken($device, $abilities)`. Yang disimpan di `personal_access_tokens` hanya hash SHA-256, plain text cuma ditampilkan sekali. Token bisa dicabut kapan saja dengan menghapus barisnya. Abilities (`notes:read`, `notes:write`) mirip OAuth scope dan dicek oleh middleware `abilities:`.

Sanctum juga bisa mode SPA (cookie session untuk frontend di domain yang sama). Mode itu pakai guard `web` di belakang layar.

### 4. HTTP Basic tanpa session

Middleware bawaan `auth.basic` menyimpan login ke session setelah berhasil. Untuk API murni stateless, [`StatelessBasicAuth`](app/Http/Middleware/StatelessBasicAuth.php) pakai `Auth::onceBasic()`, jadi setiap request harus membawa header `Authorization: Basic ...` sendiri.

### 5. JWT dengan custom guard

Laravel tidak punya JWT bawaan, jadi ini contoh bikin guard sendiri:

- [`JwtService`](app/Auth/JwtService.php) membuat dan memverifikasi token HS256 (`iss`, `sub`, `iat`, `exp`). Waktu diambil dari `ClockInterface` (PSR-20), jadi expiry bisa dites tanpa `sleep()`.
- [`JwtGuard`](app/Auth/JwtGuard.php) implement interface `Guard`. Method `check()`, `id()`, dan lainnya didapat dari trait `GuardHelpers`, cukup tulis `user()` dan `validate()`.
- Didaftarkan di [`AppServiceProvider`](app/Providers/AppServiceProvider.php) dengan `Auth::extend('jwt', ...)`, lalu dipakai di `config/auth.php` sebagai `'driver' => 'jwt'`.

Sanctum vs JWT, sering ditanya:

| | Sanctum token | JWT |
|---|---|---|
| Isi token | String acak | Klaim yang ditandatangani |
| Verifikasi | Query ke DB | Cek signature, tanpa DB |
| Revoke | Hapus baris, langsung berlaku | Tidak bisa sebelum `exp`, kecuali pakai denylist |
| Cocok untuk | Satu app dengan DB-nya sendiri | Banyak service yang tidak berbagi DB |

Ada satu bug nyata yang ketangkap test di sini: token sampah (`bukan.jwt.valid`) bikin library melempar `DomainException`, bukan `UnexpectedValueException`, sehingga request jadi error 500. Sekarang semua exception dari decode ditangkap dan dianggap tamu (401). Lihat `JwtServiceTest::garbage_is_rejected`.

### 6. API key via `Auth::viaRequest`

Untuk guard sederhana cukup satu callable. [`PartnerApiKey`](app/Auth/PartnerApiKey.php) membaca header `X-Api-Key`, mencocokkan SHA-256-nya dengan daftar di config pakai `hash_equals` (constant time, aman dari timing attack), lalu mengembalikan `GenericUser`. Jadi auth juga bisa jalan tanpa tabel apa pun.

---

## 2. Authorization

Authentication menjawab "kamu siapa", authorization menjawab "kamu boleh apa". Tiga lapis di app ini:

| Lapis | Di mana | Contoh |
|---|---|---|
| Token ability | Middleware `abilities:notes:write` | Token yang cuma punya `notes:read` dapat 403 saat `POST /api/notes` |
| Gate | `Gate::define('view-reports', ...)` + middleware `can:view-reports` | Cuma role `editor` yang boleh `GET /api/reports` |
| Policy | [`NotePolicy`](app/Policies/NotePolicy.php) + `Gate::authorize('update', $note)` | Cuma pemilik yang boleh ubah/hapus. Editor boleh *lihat* semua lewat `before()` |

Policy di sini dipasang ke DTO `NoteData`, bukan ke model Eloquent, jadi tetap jalan walaupun data disimpan di file JSON. Banyak orang mengira Policy harus terikat model.

Padanan Spring: Gate/Policy kira-kira `@PreAuthorize("hasRole('EDITOR')")` dan `@PreAuthorize("@noteSecurity.isOwner(#id)")`.

---

## 3. Persistence: tiga cara, satu interface

Controller dan service hanya kenal [`NoteRepository`](app/Notes/NoteRepository.php). Implementasinya dipilih di `AppServiceProvider` dari `NOTES_DRIVER`:

```php
$this->app->bind(NoteRepository::class, fn (Application $app) => match (config('catsheet.notes_driver')) {
    'eloquent' => new EloquentNoteRepository,
    'query'    => new QueryBuilderNoteRepository($app['db']->connection()),
    'file'     => new FileNoteRepository(Storage::disk('local')),
});
```

| Driver | Class | Pakai DB? | Kelebihan | Kekurangan |
|---|---|---|---|---|
| `eloquent` | [`EloquentNoteRepository`](app/Notes/EloquentNoteRepository.php) | Ya, via ORM | Ringkas, timestamps/casting/relasi/event otomatis | Hydrate object lebih berat, query tersembunyi (N+1) |
| `query` | [`QueryBuilderNoteRepository`](app/Notes/QueryBuilderNoteRepository.php) | Ya, tanpa ORM | Kontrol SQL penuh, ringan, cocok untuk report/batch | Mapping, timestamps, relasi urus sendiri |
| `file` | [`FileNoteRepository`](app/Notes/FileNoteRepository.php) | Tidak | Tanpa setup, cocok untuk prototipe | Tidak ada transaksi, index, atau locking antar proses |

Repository mengembalikan [`NoteData`](app/Notes/NoteData.php) (readonly DTO), bukan model Eloquent. Kalau yang dikembalikan model, kode pemanggil bisa diam-diam memanggil `$note->save()` atau relasi lazy, dan abstraksinya bocor.

Query Builder memakai binding `?` (prepared statement), jadi aman dari SQL injection. Jangan pernah menyambung input user ke string SQL.

**Active Record vs Data Mapper.** Eloquent itu Active Record: model tahu cara menyimpan dirinya (`$note->save()`). JPA/Hibernate (dan Doctrine di PHP) itu Data Mapper: entity cuma data, yang menyimpan adalah `EntityManager`. Active Record lebih cepat ditulis, Data Mapper lebih bersih untuk domain yang kompleks. Repository + DTO di sini adalah jalan tengah.

---

## 4. Jebakan Eloquent

Semua dibuktikan di [`EloquentPitfallsTest`](tests/Feature/Notes/EloquentPitfallsTest.php):

| Topik | Yang ditunjukkan |
|---|---|
| N+1 | Loop 5 note lalu akses `$note->user` = 6 query |
| Eager loading | `Note::with('user')` = 2 query (`where id in (...)`) |
| Fail fast | `Model::preventLazyLoading()` melempar exception kalau ada lazy load. Pasang di non-production |
| Transaksi | `DB::transaction()` rollback semua insert kalau ada exception di tengah |
| Mass assignment | Kolom di luar `#[Fillable]` diabaikan saat `create()` |

Laravel 13 memakai attribute PHP untuk konfigurasi model (`#[Fillable([...])]`, `#[Hidden([...])]`) sebagai ganti property `$fillable`/`$hidden`.

`DB::transaction()` itu eksplisit. Tidak ada `@Transactional` berbasis proxy seperti di Spring, jadi tidak ada jebakan "self-invocation tidak kena transaksi". Kalau closure melempar exception, rollback. Kalau tidak, commit. Parameter kedua (`attempts`) untuk retry saat deadlock.

---

## 5. OOP di Laravel

| Konsep | Di app ini |
|---|---|
| Interface + beberapa implementasi | `NoteRepository` dengan 4 implementasi, `Guard` dengan `JwtGuard` |
| Dependency injection | Constructor injection di `NoteController`, method injection `JwtService` di `JwtTokenController::store()` |
| IoC container | Binding di `AppServiceProvider` (`bind`, `singleton`, property `$singletons`) |
| Trait | `GuardHelpers` di `JwtGuard`, `HasApiTokens`/`HasFactory` di `User` |
| Immutability | `NoteData` readonly, perubahan lewat `withChanges()`/`withId()` |
| Service layer | `NoteService` berisi aturan bisnis (normalisasi judul, kuota), tidak tahu soal HTTP atau DB |
| Enum | `Role` di-cast otomatis dari kolom string |
| Invokable class | `WhoAmIController`, `PartnerApiKey` (`__invoke`) |

**Facade vs injection.** `DB::table()` terlihat seperti static call, padahal Facade memakai `__callStatic` untuk meneruskan panggilan ke object di container. Praktis, tapi dependency-nya tersembunyi. Di `QueryBuilderNoteRepository` koneksi di-inject lewat constructor supaya dependency-nya kelihatan dan bisa diganti di test.

**Kenapa `register()` dan `boot()` dipisah?** `register()` cuma untuk binding ke container dan belum boleh memakai service lain, karena provider lain mungkin belum terdaftar. `boot()` jalan setelah semua provider ter-register, jadi aman untuk `Auth::extend`, `Gate::define`, dan sebagainya.

---

## 6. Testing

```
tests/
├── Unit/                         # extends PHPUnit\Framework\TestCase, TIDAK boot Laravel
│   ├── NoteServiceTest.php       # pakai InMemoryNoteRepository (fake) dan createMock
│   └── JwtServiceTest.php        # clock bisa diatur -> test expiry tanpa sleep
└── Feature/                      # extends Tests\TestCase, boot Laravel + HTTP palsu
    ├── Auth/
    │   ├── SessionLoginTest.php  # web, admin, redirect tamu, logout, rate limit
    │   └── TokenAuthTest.php     # Sanctum, Basic, JWT (expired, dipalsukan), API key, multi guard
    └── Notes/
        ├── NoteRepositoryContract.php        # abstract: satu set test untuk semua repository
        ├── EloquentNoteRepositoryTest.php
        ├── QueryBuilderNoteRepositoryTest.php
        ├── FileNoteRepositoryTest.php
        ├── NoteApiTest.php                   # API yang sama x 3 driver (DataProvider)
        └── EloquentPitfallsTest.php
```

Beberapa teknik yang layak diceritakan saat interview:

- **Unit vs feature.** Unit test `extends PHPUnit\Framework\TestCase` sehingga tidak boot framework dan selesai dalam milidetik. Itu bisa karena `NoteService` bergantung ke interface. Feature test `extends Tests\TestCase` dan mengirim request palsu ke HTTP kernel, mirip MockMvc.
- **Contract test.** [`NoteRepositoryContract`](tests/Feature/Notes/NoteRepositoryContract.php) adalah abstract test class dengan method abstract `makeRepository()`. Tiga subclass cuma mengisi method itu, dan kelimanya test dijalankan untuk tiap implementasi. Ini cara membuktikan LSP.
- **Satu API, tiga driver.** `NoteApiTest::same_api_works_with_every_persistence_driver` memakai `#[DataProvider]` untuk mengganti `catsheet.notes_driver`, dan alur CRUD lewat HTTP harus tetap sama.
- **Helper Laravel.** `RefreshDatabase` (migrate sekali, tiap test di-rollback), `Sanctum::actingAs()`, `actingAs($user, 'web')`, `withBasicAuth()`, `withToken()`, `travel(2)->hours()` untuk memajukan waktu, `Storage::fake()`, `assertDatabaseHas/Missing`, `assertAuthenticatedAs`, `assertGuest`.
- **Menghitung query.** `DB::enableQueryLog()` + `DB::getQueryLog()` untuk membuktikan N+1.
- **Guard di-cache per app instance.** Kalau satu test mengirim beberapa request dengan token berbeda, panggil `$this->app['auth']->forgetGuards()` di antaranya. Kalau tidak, user dari request pertama masih menempel.

---

## 7. Pertanyaan interview

**Bagaimana Laravel mengenali user di tiap request?**
Middleware `auth:<guard>` memanggil guard. Guard session membaca ID user dari session, guard token membaca header `Authorization`. Guard lalu minta user ke provider (Eloquent atau database). User disimpan di guard selama request.

**Bagaimana cara punya login user dan admin yang terpisah?**
Dua guard dengan provider berbeda (`users` dan `admins`), route dilindungi `auth:web` dan `auth:admin`. Session key-nya beda per guard, jadi login di satu guard tidak memengaruhi yang lain.

**Kenapa harus `session()->regenerate()` setelah login?**
Mencegah session fixation: penyerang yang sudah menyelipkan session ID ke korban tidak bisa ikut memakai session itu setelah korban login.

**Kenapa CSRF tidak berlaku di `routes/api.php`?**
Grup `api` tidak memakai session/cookie, autentikasinya lewat header yang tidak dikirim otomatis oleh browser. CSRF cuma relevan untuk autentikasi berbasis cookie.

**Bagaimana menyimpan API key dengan aman?**
Simpan hash-nya saja, bandingkan dengan `hash_equals()` supaya waktu perbandingannya konstan. Sanctum melakukan hal yang sama untuk token.

**Eloquent vs Query Builder, kapan pakai yang mana?**
Eloquent untuk CRUD sehari-hari dan relasi. Query Builder/raw SQL untuk report, agregasi, bulk update, atau saat performa dan bentuk SQL penting.

**Apa itu N+1 dan cara mencegahnya?**
Satu query untuk list, lalu satu query per baris untuk relasi. Cegah dengan `with()`/`load()`, dan pasang `Model::preventLazyLoading()` di development supaya ketahuan sejak awal.

**Apa beda `bind` dan `singleton` di container?**
`bind` membuat instance baru setiap di-resolve, `singleton` membuat sekali lalu dipakai ulang. Di PHP-FPM "sekali" artinya sekali per request. Di Octane sekali per worker, jadi hati-hati menyimpan state request di singleton.

**Kenapa repository mengembalikan DTO dan bukan model?**
Supaya pemanggil tidak bergantung ke Eloquent: tidak bisa diam-diam `save()` atau memicu lazy load, dan implementasi penyimpanan bisa diganti (di sini ke file JSON) tanpa mengubah controller.
