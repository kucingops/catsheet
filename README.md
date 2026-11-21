# catsheet

Cheatsheet pribadi buat persiapan interview: konsep, contoh kode yang bisa dijalankan, dan penjelasan singkat. Satu repo untuk semua bahasa, disusun per bahasa lalu per framework.

## Struktur

```
catsheet/
├── java/
│   ├── core/            # OOP, collections, generics, concurrency, streams
│   └── spring-boot/
│       ├── security/    # multiple login: form+session, basic, JWT, OAuth2, ...
│       ├── persistence/ # simpan data: JPA/Hibernate, JdbcTemplate, in-memory/file
│       └── oop/         # implementasi OOP di aplikasi Spring + penjelasan
├── js/                  # Node 26 + NestJS 12: OOP, multiple login, persistence, test -> js/README.md
└── go/                  # Go 1.27 + Gin 1.12, gaya Go idiomatis -> go/README.md
```

.NET: [dotnet/](dotnet/README.md) (.NET 11 / ASP.NET Core 11)

## Isi Java / Spring Boot (rencana)

| Topik | Yang dibahas |
|---|---|
| OOP | Encapsulation, inheritance, polymorphism, abstraction, SOLID, design pattern yang sering ditanya |
| Security | `SecurityFilterChain` berbeda per jalur login, form login + session, HTTP Basic, JWT stateless, OAuth2 login, method security (`@PreAuthorize`) |
| Persistence | JPA entity & relasi, lazy vs eager, N+1, transaksi (`@Transactional`, propagation), vs `JdbcTemplate`, vs tanpa database |
| Spring core | IoC/DI, bean scope & lifecycle, AOP, profile & config |
| Testing | `@SpringBootTest`, slice test (`@WebMvcTest`, `@DataJpaTest`), Mockito |

Setiap topik punya `README.md` sendiri: penjelasan singkat, pertanyaan interview yang umum, dan link ke kode contohnya.

Java / Quarkus (Java 25 + Quarkus 3.40): lihat [java/quarkus](java/quarkus/README.md).
PHP 8.6 + Laravel 13: lihat [php/README.md](php/README.md).
