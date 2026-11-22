# JavaScript / TypeScript (Node.js 26 LTS + NestJS 12)

Bagian JS dari catsheet. Semua kode pakai **TypeScript** (default untuk backend sekarang), tapi gayanya ngikutin JS sendiri, bukan Java yang ditulis ulang:

- `core/` = **JS idiomatis**: function, closure, module, prototype, data + function, async. Class cuma di tempat yang memang lumrah (custom `Error`, struktur data, extend API platform).
- `nestjs/` = **gaya framework**: NestJS memang berbasis class + decorator + DI container, jadi di situ class dipakai sesuai konvensi framework-nya.

Alasan lengkapnya ada di [DECISIONS.md](DECISIONS.md).

| Folder | Isi | Jalankan |
|---|---|---|
| [`core/`](core/README.md) | Fundamental JS **tanpa framework**, gaya native: function & higher-order, closure, module (ESM), object/prototype/`this`, functional & immutability, composition & DI pakai function, async/event loop, design pattern versi JS, kapan class memang cocok | `npm i && npm test` |
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

CI: [`.github/workflows/js.yml`](../.github/workflows/js.yml) menjalankan typecheck, format check, test, dan demo `core/`, plus lint, build, unit test, dan e2e `nestjs/` di Node 26 setiap ada perubahan di `js/`.

## Cheatsheet Java -> JS/TS (cepat)

Versi "JS polos" (tanpa framework) ada di [core/README.md](core/README.md#peta-cepat-konsep-java---cara-js). Tabel di bawah fokus ke TypeScript + NestJS.

| Java / Spring | TypeScript / NestJS |
|---|---|
| `private` (dijaga JVM) | `#field` (hard private). Keyword `private` TS cuma dicek compiler |
| `final` field | `readonly` |
| `@Override` | `override` (+ `noImplicitOverride`) |
| Utility class / singleton | `export function` / module (module di-cache = singleton) |
| Builder / overloading | options object dengan default |
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
