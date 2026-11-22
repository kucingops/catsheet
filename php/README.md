# PHP 8.6 + Laravel 13

Cheatsheet PHP buat interview, ditulis dari sudut pandang orang yang udah lama di Java/Spring Boot. Fokusnya OOP, cara simpan data (pakai ORM dan tanpa ORM), macam-macam login, dan unit test. Semua kode bisa dijalankan dan semua contoh punya test.

| | Versi |
|---|---|
| PHP | 8.6.0 |
| Laravel | 13.x (diuji di 13.43) |
| PHPUnit | 12.5 |
| Auth tambahan | Sanctum 4, firebase/php-jwt 7 |

## Isi

| Folder | Isi | Test |
|---|---|---|
| [`core/`](core/README.md) | PHP murni tanpa framework: 4 pilar OOP, interface vs abstract vs trait, enum, value object, property hooks, late static binding, magic method, SOLID, design pattern, mini DI container, fitur PHP 8.4 sampai 8.6 | 48 test |
| [`laravel/`](laravel/README.md) | App Laravel 13: 6 cara login (session, admin guard terpisah, Sanctum token, HTTP Basic, JWT custom guard, API key), Gate & Policy, satu repository dengan 3 penyimpanan (Eloquent, Query Builder/raw SQL, file JSON), jebakan ORM (N+1, transaksi, mass assignment) | 53 test |

## Cara jalanin

Paling gampang pakai Docker, jadi tidak perlu install PHP 8.6 di laptop:

```bash
docker build -t catsheet-php php/

# core
docker run --rm -v "$PWD/php/core:/app" catsheet-php sh -c "composer install && composer test"

# laravel (SQLite in-memory, tidak butuh DB server)
docker run --rm -v "$PWD/php/laravel:/app" catsheet-php sh -c "composer install && php artisan test"
```

Kalau PHP 8.6 + Composer sudah terpasang lokal, cukup `composer install && composer test` (core) atau `composer install && php artisan test` (laravel) di folder masing-masing.

## Peta cepat Java/Spring ke PHP/Laravel

| Java / Spring | PHP / Laravel | Catatan |
|---|---|---|
| `record`, `final` field | `readonly class`, `readonly` property | Sama-sama immutable setelah constructor |
| getter/setter | property hooks, `public private(set)` | PHP 8.4, getter jadi jarang perlu |
| `interface` + `default` method | `interface` + `trait` | Trait boleh punya state, tapi bukan tipe |
| `enum` dengan field | `enum` dengan method + `match` | Enum PHP tidak punya constructor/field per case |
| `@Bean`, `@Configuration` | `ServiceProvider::register()` | |
| `@Autowired` constructor | Constructor injection, autowiring lewat Reflection | Tanpa anotasi, cukup type hint |
| `SecurityFilterChain` per path | Guard per route (`auth:web`, `auth:sanctum`, `auth:jwt`) | |
| `@PreAuthorize` | Gate, Policy, middleware `can:` | |
| JPA/Hibernate (Data Mapper) | Eloquent (Active Record) | Model Eloquent menyimpan dirinya sendiri |
| `JdbcTemplate` | Query Builder / `DB::select()` | |
| `@Transactional` | `DB::transaction(fn () => ...)` | Tidak ada proxy/AOP, eksplisit |
| JUnit 5 + Mockito | PHPUnit + `createMock()` / Mockery | |
| `@SpringBootTest` + MockMvc | Laravel `TestCase` + `$this->getJson()` | Request palsu langsung ke kernel |
| `@DataJpaTest` | `RefreshDatabase` + SQLite in-memory | |

## Satu perbedaan besar yang sering ditanya

PHP (mode klasik PHP-FPM) itu **share-nothing**: tiap request mulai dari nol, semua object dibuang di akhir request. Jadi:

- Singleton di container cuma hidup selama satu request, beda dengan singleton bean Spring yang hidup selama aplikasi jalan.
- Tidak ada masalah thread-safety antar request, karena tiap request punya proses/memori sendiri.
- Kalau pakai Laravel Octane (Swoole/RoadRunner/FrankenPHP), aplikasi tetap hidup di memori kayak Spring. Hati-hati dengan state statis dan singleton yang menyimpan data request.
