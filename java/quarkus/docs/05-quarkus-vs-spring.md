# Quarkus untuk orang Spring Boot

## Kamus singkat

| Spring Boot | Quarkus |
|---|---|
| `@Component` / `@Service` / `@Repository` | `@ApplicationScoped` (atau `@Singleton`) |
| `@Autowired` | `@Inject` (opsional untuk constructor tunggal) |
| `@Bean` di `@Configuration` | `@Produces` di bean mana saja |
| `@Primary` / `@Qualifier` | `@Default` / qualifier CDI, `@Typed`, `@Alternative`, `@DefaultBean` |
| `@ConditionalOnProperty` / `@Profile` | `@IfBuildProperty`, `@LookupIfProperty`, `@IfBuildProfile` |
| `@ConfigurationProperties` | `@ConfigMapping` |
| `@Value("${x}")` | `@ConfigProperty(name = "x")` |
| `application-dev.yml` | prefix `%dev.` di application.properties |
| `@RestController` + `@GetMapping` | Jakarta REST: `@Path` + `@GET` |
| `@ControllerAdvice` | `@ServerExceptionMapper` |
| Spring Data `JpaRepository` | Panache `PanacheRepositoryBase` |
| `@Transactional` (Spring) | `jakarta.transaction.Transactional` (JTA) |
| `SecurityFilterChain` | `quarkus.http.auth.permission.*` + `HttpAuthenticationMechanism` |
| `AuthenticationProvider` | `IdentityProvider` |
| `@PreAuthorize` | `@RolesAllowed`, `@PermissionsAllowed` |
| `@SpringBootTest` | `@QuarkusTest` |
| `@MockitoBean` (dulu `@MockBean`) | `@InjectMock` |
| `@WithMockUser` | `@TestSecurity` |
| Testcontainers manual | Dev Services (otomatis) |
| DevTools | `quarkus:dev` (live reload + continuous testing + Dev UI) |

## Beda filosofi

- **Build-time vs runtime**: Spring melakukan scanning, proxy, dan wiring saat startup (reflection).
  Quarkus melakukannya saat **build** (augmentation) lalu menghasilkan bytecode. Startup cepat,
  memori kecil, dan bisa dikompilasi ke native image (GraalVM) tanpa banyak konfigurasi.
- Konsekuensinya: error wiring (misalnya ambiguous bean) ketahuan saat build/test, bukan saat runtime.
  Bean yang tidak dipakai di-remove otomatis.
- **CDI (ArC)**, bukan Spring IoC. Scope default bean CDI tanpa annotation adalah `@Dependent`
  (instance baru per injection point), beda dengan Spring yang default singleton.
- `@ApplicationScoped` di-inject sebagai **client proxy** (lazy), `@Singleton` langsung instance (tanpa proxy).
- **Reactive di bawah**: Vert.x. Endpoint yang return `Uni`/`Multi` jalan di event loop (jangan blocking!),
  yang return object biasa jalan di worker thread. Bisa juga pakai virtual thread (`@RunOnVirtualThread`).
- Private field injection masih jalan, tapi Quarkus menyarankan package-private agar tidak butuh reflection.

## Pertanyaan interview

1. *Kenapa Quarkus startup cepat?* Kerja framework dipindah ke build time, minim reflection, siap native image.
2. *`@ApplicationScoped` vs `@Singleton`?* Dua-duanya satu instance. ApplicationScoped lewat proxy (lazy, bisa di-mock dengan `@InjectMock`), Singleton tidak.
3. *Kapan pakai `Uni`?* Saat I/O non-blocking (reactive client, reactive DB). Kalau pakai Hibernate ORM biasa (blocking), method biasa saja.
