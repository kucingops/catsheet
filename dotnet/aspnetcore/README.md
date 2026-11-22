# .NET 11 / ASP.NET Core 11 · cheatsheet + contoh yang bisa dijalankan

Mini toko online (produk fisik/digital, order, diskon) buat pamer **OOP**, **unit test**, **banyak cara login**, dan **persistence dengan/tanpa ORM**. Semua penjelasan dibandingkan dengan Java/Spring.

- .NET SDK 11.0.100, C# 14, ASP.NET Core 11, EF Core 11, xUnit v3, NSubstitute
- 84 test (domain, service + mock, contract test repository, integration HTTP)

## Jalankan

```bash
cd dotnet/aspnetcore
dotnet test                                    # semua test
dotnet run --project src/Catsheet.Api          # http://localhost:5080 (profile efcore)
dotnet run --project src/Catsheet.Api --launch-profile ado       # ADO.NET tanpa ORM
dotnet run --project src/Catsheet.Api --launch-profile inmemory  # tanpa database
```
Contoh request ada di `src/Catsheet.Api/Catsheet.Api.http` dan [docs/04-security.md](docs/04-security.md). OpenAPI JSON di `/openapi/v1.json` (Development).

## Baca urut

| # | Topik | Isi |
|---|---|---|
| 01 | [C# buat orang Java](docs/01-csharp-vs-java.md) | Peta Java → C#, fitur C# 14, gotcha |
| 02 | [OOP](docs/02-oop.md) | 4 pilar, SOLID, design pattern, class/struct/record. Semua dengan contoh dari domain |
| 03 | [Unit test](docs/03-unit-test.md) | JUnit/Mockito → xUnit/NSubstitute, contract test, integration test |
| 04 | [Security](docs/04-security.md) | Cookie, Basic, JWT, API key, policy scheme, role vs permission policy |
| 05 | [Persistence](docs/05-persistence.md) | EF Core (≈ JPA) vs ADO.NET (≈ JDBC) vs in-memory |
| 06 | [DI, config, middleware](docs/06-di-pipeline.md) | Lifetime, captive dependency, options, pipeline, minimal API vs controller |
| 07 | [Q&A interview](docs/07-interview-qna.md) | 34 pertanyaan + jawaban singkat |

## Struktur

```
dotnet/aspnetcore/
├── global.json                  # pin SDK 11 + runner Microsoft.Testing.Platform
├── Directory.Build.props        # setting bersama (≈ parent POM)
├── Directory.Packages.props     # versi NuGet terpusat (≈ BOM)
├── Catsheet.slnx                # solution format baru (XML)
├── src/
│   ├── Catsheet.Domain/         # OOP murni, tanpa framework
│   │   ├── Common/              # Entity<TId>, DomainException
│   │   ├── Catalog/             # Product (abstract) → PhysicalProduct / DigitalProduct, IProductRepository
│   │   ├── Pricing/             # Money (value object), IDiscountPolicy (strategy + decorator)
│   │   └── Ordering/            # Order (aggregate root, state machine), OrderLine (record)
│   └── Catsheet.Api/
│       ├── Program.cs           # DI + pipeline
│       ├── Security/            # 5 auth scheme, user store, JWT, permission policy
│       ├── Persistence/         # InMemory / EfCore / Ado (dipilih dari config)
│       ├── Application/         # service, DTO, factory, discount resolver
│       ├── Endpoints/           # minimal API
│       ├── Controllers/         # controller style (MeController)
│       └── Errors/              # IExceptionHandler → ProblemDetails
└── tests/
    ├── Catsheet.Domain.Tests/   # test domain murni
    └── Catsheet.Api.Tests/
        ├── Unit/                # service + NSubstitute + FakeTimeProvider
        ├── Persistence/         # 1 abstract contract test, 3 implementasi
        └── Integration/         # WebApplicationFactory, semua flow login
```

## Ganti versi

Folder dan branch diberi nomor versi (`claude/dotnet11-aspnetcore11`). Untuk .NET 10 LTS: ubah `global.json` (`10.0.100`), `TargetFramework` (`net10.0`) di `Directory.Build.props`, dan versi paket `11.0.x` → `10.0.x` di `Directory.Packages.props`. Hampir semua kode tetap jalan, karena fitur C# 14 sudah ada sejak .NET 10.
