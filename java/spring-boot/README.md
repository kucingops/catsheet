# Java 25 + Spring Boot 4.2

Satu aplikasi kecil yang bisa dijalankan, isinya contoh yang sering ditanya di interview: OOP, Spring Security dengan beberapa cara login, cara simpan data (dengan dan tanpa JPA), dan unit test.

```bash
mvn test                      # butuh JDK 25
mvn test -Djava.version=21    # kalau JDK-nya masih 21 (kode tetap jalan)
mvn spring-boot:run           # http://localhost:8080
```

User demo: `user / password` (ROLE_USER), `admin / admin` (ROLE_USER, ROLE_ADMIN).

| Folder | Isi |
|---|---|
| [`oop/`](src/main/java/cheat/springboot/oop) | Value object, encapsulation, sealed interface, template method, DI |
| [`security/`](src/main/java/cheat/springboot/security) | 4 `SecurityFilterChain`: form+session, Basic, JWT, token endpoint |
| [`persistence/`](src/main/java/cheat/springboot/persistence) | `ProductStore` dengan 3 implementasi: JPA, JdbcClient, in-memory |
| [`src/test/`](src/test/java/cheat/springboot) | Unit test (JUnit 5, AssertJ, Mockito), slice test, integration test |

---

## 1. OOP

| Pilar | Di mana | Intinya |
|---|---|---|
| Encapsulation | `BankAccount` | Field private, tanpa setter. Perubahan cuma lewat `deposit/withdraw` yang menjaga invariant (saldo tidak minus). `history()` mengembalikan list read-only. |
| Abstraction | `Notifier`, `Payment` | Pemanggil cuma kenal kontrak, bukan implementasinya. |
| Inheritance | `AbstractNotifier` -> `EmailNotifier`, `SmsNotifier` | Template method: alur `send()` dikunci `final`, subclass cuma override `format()` / `deliver()`. |
| Polymorphism | `PaymentService`, `FeeCalculator` | Satu variabel `Notifier` bisa Email atau SMS (runtime dispatch). `FeeCalculator` pakai pattern matching di sealed interface. |

Konsep lain yang ada di kode:
- **Immutability / value object**: `Money` (record). Operasi mengembalikan object baru, validasi di compact constructor.
- **Composition over inheritance**: `PaymentService` *punya* `FeeCalculator` dan `Notifier`, bukan *turunan* dari mereka.
- **SOLID**: S (`FeeCalculator` cuma hitung fee), O (nambah channel notifikasi = nambah class `@Component`, `PaymentService` tidak diubah), L (semua `Notifier` bisa saling ganti), I (`Notifier` cuma 2 method), D (`PaymentService` bergantung pada interface, di-inject lewat constructor).

**Pertanyaan interview**
- *Abstract class vs interface?* Abstract class bisa punya state, constructor, dan method non-public; single inheritance. Interface cuma kontrak (plus `default`/`static`/`private` method sejak Java 8/9); class bisa implement banyak. Pakai abstract class kalau ada alur/state bersama (template method), interface untuk kapabilitas.
- *Overloading vs overriding?* Overloading: nama sama, parameter beda, dipilih saat compile. Overriding: subclass ganti implementasi, dipilih saat runtime (dynamic dispatch).
- *Kenapa `equals` dan `hashCode` harus di-override bareng?* Kontrak: object yang `equals` wajib punya `hashCode` sama, kalau tidak `HashMap/HashSet` rusak. Record otomatis benar.
- *Record vs class biasa?* Record: immutable, final, untuk data carrier. Tidak cocok untuk entity JPA (butuh no-arg constructor dan mutable).
- *Sealed class buat apa?* Membatasi hierarki, jadi `switch` bisa exhaustive tanpa `default`. Compiler protes kalau ada subtype baru yang belum di-handle.
- *Switch pattern matching vs override method?* Switch gampang nambah operasi baru, override gampang nambah tipe baru (expression problem).

---

## 2. Security: banyak cara login di satu aplikasi

Kuncinya: **beberapa `SecurityFilterChain`**, masing-masing punya `securityMatcher`. Request dicek berurutan sesuai `@Order`, chain pertama yang cocok yang dipakai. Lihat [`SecurityConfig`](src/main/java/cheat/springboot/security/SecurityConfig.java).

| Order | Path | Login | State | CSRF |
|---|---|---|---|---|
| 1 | `/api/token` | HTTP Basic -> keluar JWT | stateless | off |
| 2 | `/api/**` | JWT Bearer (`oauth2ResourceServer`) | stateless | off |
| 3 | `/basic/**` | HTTP Basic | stateless | off |
| 4 | sisanya | Form login (`/login`) | HttpSession (`JSESSIONID`) | **on** |

```bash
# Basic
curl -u user:password localhost:8080/basic/hello

# JWT: ambil token, lalu pakai
TOKEN=$(curl -s -u admin:admin -X POST localhost:8080/api/token | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/hello
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/reports      # @PreAuthorize ADMIN

# Form login: buka http://localhost:8080/form/hello di browser
```

Authorization ada dua level: **URL** (`requestMatchers("/api/admin/**").hasRole("ADMIN")`) dan **method** (`@PreAuthorize` + `@EnableMethodSecurity`).

**Pertanyaan interview**
- *Alur request di Spring Security?* `DelegatingFilterProxy` -> `FilterChainProxy` -> pilih `SecurityFilterChain` yang match -> filter-filter (authentication filter, `ExceptionTranslationFilter`, `AuthorizationFilter`). Authentication: filter bikin token -> `AuthenticationManager` -> `AuthenticationProvider` (mis. `DaoAuthenticationProvider` + `UserDetailsService` + `PasswordEncoder`) -> hasil disimpan di `SecurityContextHolder` (ThreadLocal).
- *Authentication vs authorization?* Siapa kamu (401) vs boleh ngapain (403).
- *Session vs JWT?* Session: state di server, gampang di-revoke, butuh sticky session / session store kalau scale out. JWT: stateless, cocok untuk API & microservice, tapi susah di-revoke sebelum expired (solusi: TTL pendek + refresh token, atau denylist).
- *Kenapa CSRF dimatikan di API JWT?* CSRF memanfaatkan cookie yang otomatis terkirim browser. Token di header `Authorization` tidak terkirim otomatis, jadi tidak rentan. Form login pakai cookie, jadi CSRF wajib.
- *`hasRole` vs `hasAuthority`?* `hasRole("ADMIN")` = `hasAuthority("ROLE_ADMIN")`.
- *Kenapa password di-hash pakai BCrypt, bukan SHA-256?* BCrypt lambat secara sengaja dan pakai salt, jadi brute force mahal. `DelegatingPasswordEncoder` menyimpan prefix `{bcrypt}` supaya bisa migrasi algoritma.
- *Session fixation?* Penyerang menanam session id sebelum korban login. Solusi: ganti session id setelah login (`changeSessionId()`, default Spring).
- *HS256 vs RS256?* HS256: satu secret untuk sign & verify (cocok kalau issuer = verifier). RS256: private key sign, public key verify (cocok untuk banyak service, pakai JWKS).
- *OAuth2 vs OIDC?* OAuth2 untuk authorization (akses resource), OIDC menambah identitas (ID token) di atas OAuth2. Di Spring: `oauth2Login()` untuk login via Google/GitHub, `oauth2ResourceServer()` untuk validasi token (yang dipakai di sini).

---

## 3. Persistence: dengan dan tanpa JPA

Service cuma kenal interface [`ProductStore`](src/main/java/cheat/springboot/persistence/ProductStore.java). Implementasi dipilih lewat property `catsheet.store` (`@ConditionalOnProperty`):

| Nilai | Class | Cara simpan |
|---|---|---|
| `jpa` (default) | `JpaProductStore` + `ProductJpaRepository` | Hibernate, entity terpisah dari domain |
| `jdbc` | `JdbcProductStore` | SQL manual lewat `JdbcClient` |
| `memory` | `InMemoryProductStore` | `ConcurrentHashMap`, hilang saat restart |

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--catsheet.store=jdbc
```

**Pertanyaan interview**
- *JPA vs Hibernate vs Spring Data JPA?* JPA = spesifikasi. Hibernate = implementasinya. Spring Data JPA = layer di atasnya yang bikin repository otomatis.
- *Entity state?* Transient, managed, detached, removed. Entity managed di-track oleh persistence context.
- *Dirty checking?* Ubah field entity yang managed di dalam transaksi, Hibernate otomatis `UPDATE` saat flush/commit tanpa `save()`. Contoh: `JpaProductStore.rename()`.
- *Lazy vs eager?* Default `@ManyToOne`/`@OneToOne` eager, `@OneToMany`/`@ManyToMany` lazy. Akses relasi lazy di luar transaksi -> `LazyInitializationException`. Makanya `spring.jpa.open-in-view=false` di sini: masalahnya kelihatan, bukan disembunyikan.
- *N+1 problem?* 1 query ambil N parent, lalu N query untuk child-nya. Solusi: `JOIN FETCH`, `@EntityGraph`, batch fetching, atau DTO projection.
- *`@Transactional` tidak jalan, kenapa?* Spring pakai proxy: self-invocation (panggil method di class yang sama) tidak lewat proxy; method harus public; checked exception tidak rollback secara default (`rollbackFor`).
- *Propagation?* `REQUIRED` (default, ikut transaksi yang ada), `REQUIRES_NEW` (suspend lalu bikin baru, mis. untuk audit log), `MANDATORY`, `SUPPORTS`, `NOT_SUPPORTED`, `NEVER`, `NESTED` (savepoint).
- *Isolation level?* `READ_UNCOMMITTED` (dirty read), `READ_COMMITTED` (default kebanyakan DB), `REPEATABLE_READ`, `SERIALIZABLE`.
- *`readOnly = true` buat apa?* Hint ke Hibernate untuk skip dirty checking (lebih hemat), dan ke driver/DB bisa diarahkan ke replica.
- *Kapan JDBC lebih baik dari JPA?* Query reporting yang kompleks, bulk operation, butuh kontrol SQL penuh, atau tim lebih nyaman dengan SQL.
- *Optimistic vs pessimistic locking?* Optimistic: kolom `@Version`, gagal saat commit kalau ada yang ubah duluan. Pessimistic: `SELECT ... FOR UPDATE`, kunci baris dari awal.

---

## 4. Testing

| Jenis | Contoh | Load Spring? |
|---|---|---|
| Unit test murni | `MoneyTest`, `BankAccountTest`, `FeeCalculatorTest` (`@ParameterizedTest`), `NotifierTest`, `InMemoryProductStoreTest` | Tidak |
| Unit test + mock | `PaymentServiceTest` (`@ExtendWith(MockitoExtension.class)`, `@Mock`, `verify`) | Tidak |
| Slice test | `JpaProductStoreTest` (`@DataJpaTest`), `JdbcProductStoreTest` (`@JdbcTest`) | Sebagian |
| Integration test | `MultiLoginTest` (`@SpringBootTest` + `@AutoConfigureMockMvc`) | Penuh |

**Pertanyaan interview**
- *Test pyramid?* Banyak unit test (cepat), lebih sedikit integration, paling sedikit end-to-end.
- *`@Mock` vs `@MockitoBean`?* `@Mock` (Mockito murni, tanpa Spring). `@MockitoBean` mengganti bean di Spring context (pengganti `@MockBean` yang deprecated sejak Boot 3.4).
- *Kenapa constructor injection?* Field bisa `final`, dependency eksplisit, dan class bisa di-test tanpa Spring (`new PaymentService(List.of(mock))`).
- *Mock vs stub vs spy?* Stub: kasih jawaban tetap. Mock: bisa diverifikasi interaksinya. Spy: object asli yang sebagian method-nya di-stub.
- *Test DB pakai H2 cukup?* Untuk cheatsheet iya. Di project beneran lebih aman pakai Testcontainers dengan DB yang sama seperti production.
