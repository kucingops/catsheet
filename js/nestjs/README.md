# NestJS 12: OOP, multiple login, persistence, testing

App kecil "adopsi kucing" yang sengaja dibuat untuk memamerkan:

1. **OOP di aplikasi beneran**: rich domain model, abstraksi repository, DI, strategy pattern.
2. **Multiple login**: session + cookie, JWT, HTTP Basic, API key, plus role-based access.
3. **Cara simpan data**: tanpa persistence (memory), file JSON, database dengan SQL mentah, database dengan ORM. Bisa diganti lewat satu env var.
4. **Unit test & e2e test** dengan Vitest.

```bash
npm i
npm test               # unit test (60)
npm run test:e2e       # e2e lewat HTTP (16), semua driver persistence
npm run start:dev      # http://localhost:3000, PERSISTENCE=memory

PERSISTENCE=file    DATA_FILE=data/cats.json   npm run start:dev
PERSISTENCE=sqlite  DATABASE=data/cats.sqlite  npm run start:dev
PERSISTENCE=typeorm DATABASE=data/cats.db      npm run start:dev
```

Akun demo: `alice / alice123` (role `user`), `bob / bob123` (role `user`, `admin`), API key `demo-api-key-123` (service `reporting-bot`).

## Struktur

```
src/
├── main.ts / configure-app.ts      bootstrap, session middleware, ValidationPipe
├── app.module.ts                   root module (dynamic: terima pilihan persistence)
├── common/                         DomainError + DomainExceptionFilter (≈ @ControllerAdvice)
├── cats/
│   ├── domain/cat.ts               RICH DOMAIN MODEL, tanpa import NestJS sama sekali
│   ├── cat.repository.ts           PORT: abstract class CatRepository
│   ├── cats.service.ts             use case, bergantung ke abstraksi
│   ├── cats.controller.ts          HTTP + aturan akses per endpoint
│   └── dto/create-cat.dto.ts       validasi bentuk request (class-validator)
├── persistence/                    ADAPTER: 4 implementasi CatRepository
│   ├── persistence.module.ts       pilih implementasi saat startup (≈ @Profile)
│   ├── cat-repository.contract.ts  satu set test untuk SEMUA implementasi
│   ├── in-memory/  file/  sqlite/  typeorm/
└── auth/
    ├── strategies/                 STRATEGY PATTERN: session, jwt, basic, api-key
    ├── auth.guard.ts               satu guard global: authenticate (401) lalu authorize (403)
    ├── decorators.ts               @Auth(), @Roles(), @CurrentUser()
    ├── auth.controller.ts          /auth/session/login, /auth/jwt/login, /auth/me
    └── users/                      UserStore + PasswordHasher (scrypt)
test/                               e2e (supertest)
```

Arah dependency: `controller -> service -> CatRepository (abstrak) <- adapter persistence`. Domain di tengah nggak bergantung ke siapa-siapa. Ini gaya *hexagonal / ports & adapters* versi ringan.

## 1. OOP di aplikasi

| Konsep | Di mana | Penjelasan singkat |
|---|---|---|
| Encapsulation | `Cat` | State pakai `#field`. Berubah hanya lewat `adopt()` / `rename()`, yang menjaga aturan ("nggak bisa diadopsi dua kali"). Constructor private, lahir lewat `Cat.create()` (data baru, divalidasi) atau `Cat.restore()` (dari storage). |
| Abstraction | `CatRepository` | Service cuma tahu kontrak `findAll/findById/save/delete`. Pakai `abstract class` (bukan `interface`) karena interface hilang saat runtime dan nggak bisa jadi token DI. |
| Polymorphism | 4 repository, 4 auth strategy | `AuthGuard` loop `strategy.authenticate(req)` tanpa `if/else` per jenis login. Tambah jalur login baru = tambah class, guard tidak diubah (Open/Closed). |
| Inheritance | `DomainError` -> `NotFoundError`, `ConflictError`; `AuthStrategy` -> subclass | Hierarki error dipetakan ke status HTTP di satu tempat (`DomainExceptionFilter`). |
| Dependency Inversion | `CatsService(private cats: CatRepository)`, `UserStore(hasher: PasswordHasher)` | Modul atas bergantung ke abstraksi, implementasi dipilih oleh module. |
| Liskov | `cat-repository.contract.ts` | Satu test suite dijalankan ke 4 implementasi. Semua lolos = bisa saling tukar. Contoh nyata: `InMemoryCatRepository` menyimpan *snapshot*, bukan object asli, supaya perilakunya sama dengan DB (perubahan tanpa `save()` tidak tersimpan). |
| Adapter | `TypeOrmCatRepository` | Membungkus `Repository<CatOrmEntity>` milik TypeORM supaya cocok dengan port kita. |
| Data Mapper | `CatOrmEntity.fromDomain()/toDomain()` | Entity ORM dipisah dari domain, jadi domain bersih dari decorator ORM. |

**Rich vs anemic model**: model anemic = class isinya cuma field + getter/setter, logika di service. Rich = aturan bisnis ada di dalam object (`cat.adopt()`), service tinggal orkestrasi. Rich lebih gampang dites (unit test tanpa mock) dan aturan nggak tercecer.

### Cara DI NestJS bekerja (vs Spring)

- `@Injectable()` + daftar di `providers` module = bean.
- Nest membaca **tipe parameter constructor** (`emitDecoratorMetadata`) untuk tahu apa yang harus disuntik. Karena itu tokennya harus sesuatu yang ada di runtime: class / abstract class / `Symbol` / string.
- Pendaftaran provider: `useClass` (Nest yang `new`), `useFactory` (kita yang `new`, bisa `inject` dependency), `useValue` (object jadi, sering untuk mock).
- "Inject list of beans" ala Spring (`List<AuthenticationProvider>`) nggak ada bawaan, jadi dibuat manual: provider `AUTH_STRATEGIES` dengan `useFactory: (...s) => s` (lihat `auth.module.ts`).
- Scope default **singleton**, sama dengan Spring.

## 2. Multiple login

Satu `AuthGuard` global. Route tanpa `@Auth()` / `@Roles()` = publik.

| Jalur | Cara pakai | Stateful? | Cocok untuk | Catatan keamanan |
|---|---|---|---|---|
| **Session** | `POST /auth/session/login` -> cookie `sid` | Ya (server simpan sesi) | web app server-rendered / SPA satu domain | `regenerate()` setelah login (anti session fixation), cookie `httpOnly` + `sameSite=lax`, butuh shared store (Redis) kalau scale out |
| **JWT** | `POST /auth/jwt/login` -> `Authorization: Bearer <token>` | Tidak | API, mobile, antar service | Nggak bisa di-revoke sebelum `exp`, jadi umur pendek (15 menit) + refresh token. Role di token bisa basi |
| **HTTP Basic** | `Authorization: Basic base64(user:pass)` tiap request | Tidak | tool internal, script | Base64 bukan enkripsi, wajib HTTPS. Password di-hash ulang tiap request |
| **API key** | header `x-api-key` | Tidak | mesin / bot / integrasi partner | Disimpan sebagai hash, role terbatas (`service`), bisa di-rotate per client |

Matriks akses endpoint:

| Endpoint | Aturan | Decorator |
|---|---|---|
| `GET /cats`, `GET /cats/:id` | publik | (tanpa) |
| `POST /cats` | login lewat jalur apa saja | `@Auth()` |
| `POST /cats/:id/adopt` | hanya manusia (session / JWT) | `@Auth('session', 'jwt')` |
| `GET /cats/stats` | hanya mesin (API key) | `@Auth('api-key')` |
| `DELETE /cats/:id` | role admin | `@Roles('admin')` |
| `GET /auth/me` | login jalur apa saja, tampilkan jalur yang dipakai | `@Auth()` |

**401 vs 403**: 401 = "kamu siapa?" (belum/salah login). 403 = "aku tahu kamu siapa, tapi kamu nggak boleh". Guard ini mengikuti urutan itu.

**Kontrak strategy**: return `null` = "kredensial jenis saya nggak ada, coba yang lain"; `throw` = "ada tapi salah" (langsung 401). Jadi request dengan token JWT rusak nggak diam-diam jatuh ke strategi lain.

Coba manual:

```bash
# session (cookie disimpan di file jar)
curl -c jar -H 'content-type: application/json' -d '{"username":"alice","password":"alice123"}' localhost:3000/auth/session/login
curl -b jar localhost:3000/auth/me

# JWT
TOKEN=$(curl -s -H 'content-type: application/json' -d '{"username":"bob","password":"bob123"}' localhost:3000/auth/jwt/login | jq -r .accessToken)
curl -H "Authorization: Bearer $TOKEN" localhost:3000/auth/me

# Basic
curl -u alice:alice123 -H 'content-type: application/json' -d '{"name":"Oyen","breed":"Domestik","age":2}' localhost:3000/cats

# API key
curl -H 'x-api-key: demo-api-key-123' localhost:3000/cats/stats
```

Kenapa nggak pakai Passport? Passport (`@nestjs/passport`) itu cara yang umum dan layak disebut di interview. Di sini guard + strategy ditulis sendiri supaya kelihatan apa yang terjadi di balik layar dan supaya OOP-nya (abstract class + polymorphism) eksplisit. Bentuknya sama persis: satu class per strategi.

Password di-hash dengan **scrypt** dari `node:crypto` (salt acak, `timingSafeEqual`). Alternatif yang umum: bcrypt / argon2.

## 3. Cara simpan data

Semua implementasi `CatRepository`, pilih via `PERSISTENCE=memory|file|sqlite|typeorm`.

| Driver | Class | Padanan Java | Bertahan setelah restart? | Kapan dipakai |
|---|---|---|---|---|
| `memory` | `InMemoryCatRepository` | `ConcurrentHashMap` | Tidak | test, prototipe, cache |
| `file` | `JsonFileCatRepository` | tulis file pakai `Files` | Ya | config / data kecil, single instance |
| `sqlite` | `SqliteCatRepository` (`node:sqlite`) | JDBC / `JdbcTemplate` | Ya (kalau `DATABASE` diisi) | butuh kontrol SQL penuh, query rumit / performa |
| `typeorm` | `TypeOrmCatRepository` + `CatOrmEntity` | JPA / Hibernate + Spring Data | Ya (kalau `DATABASE` diisi) | CRUD standar, relasi, migrasi |

Poin yang bisa dibahas dari kodenya:

- **File**: atomic write (tulis ke `.tmp` lalu `rename`), antrian tulis (promise chain sebagai mutex) supaya `save` paralel nggak saling timpa. Cuma aman untuk satu proses.
- **Raw SQL**: prepared statement (anti SQL injection, ada test-nya), upsert `ON CONFLICT DO UPDATE`, transaksi manual `BEGIN/COMMIT/ROLLBACK` di `saveAll()` (ada test rollback-nya), mapping row -> domain manual. `node:sqlite` itu **sync**, jadi memblok event loop: oke untuk SQLite lokal, jangan untuk DB lewat jaringan.
- **ORM**: entity terpisah dari domain (Data Mapper), `synchronize: true` cuma untuk dev (production pakai migration), `repository.save()` = upsert by primary key. Ganti ke Postgres cukup ubah config `TypeOrmModule.forRoot`.
- **Kenapa semua method async**, padahal memory sync? Supaya kontraknya seragam dan implementasi bisa saling ganti.

ORM lain yang populer di ekosistem Node: **Prisma** (schema-first, type-safe client), **Drizzle** (SQL-like, ringan), **MikroORM** (Unit of Work, paling mirip Hibernate).

## 4. Testing

| Level | File | Teknik |
|---|---|---|
| Domain | `cats/domain/cat.spec.ts` | Plain unit test, tanpa mock. `it.each` untuk tabel kasus |
| Service (fake) | `cats/cats.service.spec.ts` | `new CatsService(new InMemoryCatRepository())`, tanpa container DI |
| Service (mock) | `cats/cats.service.spec.ts` | `Test.createTestingModule` + `{ provide: CatRepository, useValue: mock }` (≈ `@MockBean`), `vi.fn().mockResolvedValue()`, verifikasi `save` tidak dipanggil saat gagal |
| Repository | `persistence/**/*.spec.ts` | **Contract test** yang sama untuk 4 implementasi + test khusus (restart, rollback, SQL injection) |
| Auth strategy | `auth/strategies/strategies.spec.ts` | Request palsu, JWT asli/forged/expired |
| Guard | `auth/auth.guard.spec.ts` | `ExecutionContext` palsu + class dummy bertanda `@Auth/@Roles`, stub strategy |
| E2E | `test/*.e2e-spec.ts` | App utuh lewat HTTP (supertest), `request.agent` untuk cookie, `describe.each` semua driver persistence |

Fake vs mock: fake (implementasi ringan yang beneran jalan) lebih tahan refactor dan menguji perilaku. Mock cocok untuk mensimulasikan error atau memverifikasi interaksi. Pakai dua-duanya sesuai kebutuhan.

## Pertanyaan interview yang bisa dijawab dari repo ini

1. **Bedanya guard, middleware, interceptor, pipe, filter di NestJS?** Urutan request: middleware -> guard -> interceptor (before) -> pipe -> handler -> interceptor (after) -> filter (kalau error). Middleware nggak tahu handler mana yang dituju; guard tahu (`ExecutionContext`), makanya otorisasi di guard.
2. **Kenapa abstract class jadi token DI, bukan interface?** Interface hilang saat runtime.
3. **Session vs JWT, kapan pakai yang mana?** Lihat tabel di bagian 2.
4. **Gimana cara revoke JWT?** Umur pendek + refresh token, atau denylist (`jti`) di Redis, atau versi token per user.
5. **Kenapa `regenerate()` session setelah login?** Mencegah session fixation.
6. **Bagaimana mencegah SQL injection?** Parameter binding (prepared statement), bukan string concat.
7. **Repository pattern itu buat apa kalau ORM sudah punya repository?** Memisahkan domain dari teknologi storage. Buktinya di sini: 4 storage, service & test service nggak berubah.
8. **Node single thread, kok bisa handle banyak request?** I/O non-blocking + event loop. Yang bahaya justru kerjaan CPU berat atau API sync (contoh: `node:sqlite`, `scryptSync`).
9. **Unit test vs e2e test, apa yang dites di mana?** Aturan bisnis di unit (cepat, banyak). Wiring (guard, pipe, filter, DI) di e2e (sedikit tapi menyeluruh).
