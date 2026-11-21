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
├── js/                  # nanti
└── go/                  # Go 1.27 + Gin 1.12, lihat go/README.md
```

## Isi Java / Spring Boot (rencana)

| Topik | Yang dibahas |
|---|---|
| OOP | Encapsulation, inheritance, polymorphism, abstraction, SOLID, design pattern yang sering ditanya |
| Security | `SecurityFilterChain` berbeda per jalur login, form login + session, HTTP Basic, JWT stateless, OAuth2 login, method security (`@PreAuthorize`) |
| Persistence | JPA entity & relasi, lazy vs eager, N+1, transaksi (`@Transactional`, propagation), vs `JdbcTemplate`, vs tanpa database |
| Spring core | IoC/DI, bean scope & lifecycle, AOP, profile & config |
| Testing | `@SpringBootTest`, slice test (`@WebMvcTest`, `@DataJpaTest`), Mockito |

Setiap topik punya `README.md` sendiri: penjelasan singkat, pertanyaan interview yang umum, dan link ke kode contohnya.
