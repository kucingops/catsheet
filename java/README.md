# Java

| Folder | Versi | Isi |
|---|---|---|
| [spring-boot/](spring-boot/README.md) | Java 25, Spring Boot 4.2 | OOP, 4 `SecurityFilterChain` (form+session, Basic, JWT, token endpoint), `ProductStore` dengan JPA / JdbcClient / in-memory, unit + slice + integration test |
| [quarkus/](quarkus/README.md) | Java 25, Quarkus 3.40 | OOP, 4 cara login, persistence pakai DB vs tanpa DB, test berlapis, perbandingan Quarkus vs Spring |

Dua-duanya jalan dengan `mvn test` (butuh JDK 25) dan dites di CI ([java.yml](../.github/workflows/java.yml)).
