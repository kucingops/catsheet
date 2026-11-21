# JavaScript / TypeScript (Node.js 26 LTS + NestJS 12)

Bagian JS dari catsheet. Semua kode pakai **TypeScript**, karena untuk backend sekarang itu default-nya, dan konsep OOP-nya paling gampang dibandingkan dengan Java.

| Folder | Isi | Jalankan |
|---|---|---|
| [`core/`](core/README.md) | OOP & fundamental JS **tanpa framework**: encapsulation, inheritance, polymorphism, abstraction, composition, SOLID, prototype & `this`, design pattern, event loop | `npm i && npm test` |
| [`nestjs/`](nestjs/README.md) | App NestJS: rich domain model, DI ke abstraksi, **4 jalur login** (session, JWT, Basic, API key) + role, **4 cara simpan data** (memory, file JSON, raw SQL, TypeORM), unit + e2e test | `npm i && npm test && npm run test:e2e` |

Butuh Node **26+** (`node -v`). Folder `core/` bahkan bisa dijalankan tanpa build: `node src/demo.ts` (Node 26 bisa langsung eksekusi TypeScript lewat *type stripping*).

## Kenapa NestJS (bukan Express polos)?

- **Paling mirip Spring Boot**: module, provider, constructor injection, decorator (`@Controller`, `@Injectable`), guard, pipe, filter, interceptor. Buat orang Java, mental model-nya langsung nyambung, dan enak buat nunjukin OOP + DI yang rapi.
- Express polos itu cuma router + middleware. Struktur, DI, validasi, testing harus dirakit sendiri, jadi kurang cocok untuk "show off arsitektur".
- NestJS tetap jalan **di atas Express** (default), jadi semua middleware Express (`express-session`, dll) tetap kepakai. Pertanyaan "Express vs NestJS" bisa dijawab dari pengalaman langsung.

## Versi yang dipakai

| Komponen | Versi | Catatan |
|---|---|---|
| Node.js | 26 LTS | `node:sqlite` bawaan, type stripping TS, `EventEmitter` generic |
| NestJS | 12 | ESM-only, test default pakai **Vitest** (bukan Jest lagi) |
| TypeScript | 6 | |
| TypeORM | 1.x | dengan `sql.js` (SQLite WebAssembly, tanpa native build) |
| Vitest | 4 | API mirip Jest: `describe/it/expect`, mock pakai `vi.fn()` |

Nama branch-nya juga bawa versi (`js/node26-nestjs12`), jadi kalau nanti mau versi lain cukup bikin branch baru, misalnya `js/node24-express5`.

## Cheatsheet Java -> JS/TS (cepat)

| Java / Spring | TypeScript / NestJS |
|---|---|
| `private` (dijaga JVM) | `#field` (hard private). Keyword `private` TS cuma dicek compiler |
| `final` field | `readonly` |
| `@Override` | `override` (+ `noImplicitOverride`) |
| `interface` (ada di runtime) | `interface` **hilang** saat runtime, jadi pakai `abstract class` kalau butuh token DI / `instanceof` |
| Nominal typing | **Structural** typing: cocok bentuk = cocok tipe |
| Method overloading | Cuma overload *signature*, implementasinya satu |
| `@Component` / `@Service` | `@Injectable()` |
| `@Configuration` + `@Bean` | `@Module({ providers: [{ provide, useFactory }] })` |
| `@Profile` / `@ConditionalOnProperty` | Dynamic module (`PersistenceModule.forRoot(...)`) |
| `@PostConstruct` / `@PreDestroy` | `onModuleInit()` / `onModuleDestroy()` |
| `@Valid` + Bean Validation | `ValidationPipe` + `class-validator` |
| `@ControllerAdvice` | `@Catch()` exception filter |
| Security filter chain | Guard (`CanActivate`) |
| `@PreAuthorize("hasRole(...)")` | `@Roles('admin')` (custom decorator + guard) |
| `@AuthenticationPrincipal` | `@CurrentUser()` (custom param decorator) |
| JPA / Hibernate | TypeORM / Prisma / Drizzle / MikroORM |
| JdbcTemplate | Driver langsung (`node:sqlite`, `pg`, `mysql2`) |
| JUnit + Mockito | Vitest + `vi.fn()` / `vi.spyOn()` |
| `@SpringBootTest` + MockMvc | `Test.createTestingModule()` + supertest |
| Thread per request | Single thread + event loop (jangan blok pakai kerjaan CPU berat) |
