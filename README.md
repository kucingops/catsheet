# catsheet

Cheatsheet pribadi buat persiapan interview: konsep, contoh kode yang bisa dijalankan, dan penjelasan singkat. Satu repo untuk semua bahasa, disusun per bahasa lalu per framework. Tiap folder punya `README.md` sendiri: penjelasan, pertanyaan interview yang umum, cara jalanin, dan unit test.

Gaya kodenya ngikutin bahasa masing-masing. OOP ditonjolkan di bahasa yang memang OOP-native (Java, PHP, C#). Go, JS, dan Python ditulis dengan gaya asli mereka; alasannya ada di `DECISIONS.md` masing-masing.

## Isi

| Bahasa | Versi | Gaya | Folder | CI |
|---|---|---|---|---|
| Java | Java 25 + Spring Boot 4.2 | OOP | [java/spring-boot](java/spring-boot/README.md) | [java.yml](.github/workflows/java.yml) |
| Java | Java 25 + Quarkus 3.40 | OOP | [java/quarkus](java/quarkus/README.md) | [java.yml](.github/workflows/java.yml) |
| PHP | PHP 8.6 + Laravel 13 | OOP | [php/](php/README.md) (core, laravel) | [php.yml](.github/workflows/php.yml) |
| C# / .NET | .NET 11 + ASP.NET Core 11 | OOP | [dotnet/](dotnet/README.md) (aspnetcore) | [dotnet.yml](.github/workflows/dotnet.yml) |
| Go | Go 1.27 + Gin 1.12 | Go idiomatis ([kenapa](go/DECISIONS.md)) | [go/](go/README.md) (core/idiomatic, gin) | [go.yml](.github/workflows/go.yml) |
| JS / TS | Node 26 + NestJS 12 | JS idiomatis ([kenapa](js/DECISIONS.md)) | [js/](js/README.md) (core, nestjs) | [js.yml](.github/workflows/js.yml) |
| Python | Python 3.14 + FastAPI 0.165 | Pythonic ([kenapa](python/DECISIONS.md)) | [python/](python/README.md) (core, fastapi) | [python.yml](.github/workflows/python.yml) |

## Struktur

```
catsheet/
├── java/
│   ├── spring-boot/   # OOP, 4 SecurityFilterChain, JPA vs JdbcClient vs in-memory
│   └── quarkus/       # OOP, 4 cara login, Panache vs tanpa DB, perbandingan dengan Spring
├── php/
│   ├── core/          # PHP murni: 4 pilar OOP, SOLID, design pattern
│   └── laravel/       # 6 cara login, Eloquent vs Query Builder vs file JSON
├── dotnet/
│   └── aspnetcore/    # OOP, multi-scheme auth, EF Core vs ADO.NET vs in-memory
├── go/
│   ├── core/idiomatic/  # struct, error sebagai nilai, interface kecil, goroutine
│   └── gin/             # Basic, session, JWT, API key; memory, file JSON, SQLite
├── js/
│   ├── core/          # function, closure, module, async (tanpa framework)
│   └── nestjs/        # 4 jalur login; memory, file JSON, raw SQL, TypeORM
└── python/
    ├── core/pythonic/ # function, dataclass, comprehension, generator
    └── fastapi/       # multiple login; memory, file JSON, SQL mentah, SQLAlchemy
```

## Topik yang dibahas di tiap bahasa

| Topik | Yang dibahas |
|---|---|
| Gaya bahasa | OOP (encapsulation, inheritance, polymorphism, abstraction, SOLID) di Java/PHP/C#; gaya native di Go/JS/Python |
| Security | Beberapa cara login dalam satu app: session/form, HTTP Basic, JWT, token/API key, role check |
| Persistence | Simpan data pakai ORM (JPA, Panache, Eloquent, EF Core, TypeORM, SQLAlchemy) dan tanpa ORM (JDBC/SQL langsung, file, in-memory) |
| Testing | Unit test + test integrasi, semua jalan di CI |
