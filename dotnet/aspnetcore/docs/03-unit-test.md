# 03 · Unit test (xUnit v3 + NSubstitute)

```bash
dotnet test                                                   # semua
dotnet test --project tests/Catsheet.Domain.Tests             # satu project
dotnet test -- --filter-class "*AuthFlowTests"                # satu class
dotnet test -- --filter-method "*HappyHour*"                  # by nama method
```

Repo ini pakai **Microsoft.Testing.Platform** (runner baru, diaktifkan di `global.json` bagian `"test"`). Jadi tidak perlu `Microsoft.NET.Test.Sdk` dan test project bisa langsung dijalankan sebagai exe (`OutputType=Exe`).

## Peta JUnit/Mockito → xUnit/NSubstitute

| JUnit 5 / Mockito | xUnit v3 / NSubstitute |
|---|---|
| `@Test` | `[Fact]` |
| `@ParameterizedTest` + `@CsvSource` | `[Theory]` + `[InlineData(...)]` |
| `@MethodSource` | `[MemberData(nameof(X))]` + `TheoryData<...>` (type-safe) |
| `@BeforeEach` | **constructor**. xUnit bikin instance baru per test. |
| `@AfterEach` | `IDisposable.Dispose` / `IAsyncLifetime.DisposeAsync` |
| `@BeforeAll` (shared state) | `IClassFixture<T>` (per class), `ICollectionFixture<T>` (lintas class) |
| `assertEquals(exp, act)` | `Assert.Equal(exp, act)` |
| `assertThrows` | `Assert.Throws<T>` / `await Assert.ThrowsAsync<T>` |
| `@Disabled` | `[Fact(Skip = "...")]` |
| `mock(Foo.class)` | `Substitute.For<IFoo>()` |
| `when(x.m()).thenReturn(v)` | `x.M().Returns(v)` |
| `verify(x).m(arg)` | `x.Received().M(arg)` |
| `verify(x, never())` | `x.DidNotReceive()` / `DidNotReceiveWithAnyArgs()` |
| `argThat(...)` / `any()` | `Arg.Is<T>(...)` / `Arg.Any<T>()` |
| `Clock.fixed(...)` | `FakeTimeProvider` (bisa `Advance(...)`) |
| `@SpringBootTest` + MockMvc | `WebApplicationFactory<Program>` + `HttpClient` |
| `@DataJpaTest` + H2 | EF Core + **SQLite in-memory** |

## Jenis test di repo ini

| Level | File | Yang dibuktikan |
|---|---|---|
| Domain (murni) | `tests/Catsheet.Domain.Tests/*` | Invariant, polymorphism, state machine, strategy diskon. Tanpa mock, sangat cepat. |
| Service + mock | `tests/Catsheet.Api.Tests/Unit/*` | Orkestrasi: repository dipanggil atau tidak, error ketika data tidak ada. |
| Contract test repository | `tests/Catsheet.Api.Tests/Persistence/*` | **Satu abstract test class, tiga subclass**: in-memory, EF Core, ADO.NET semua lolos test yang sama. |
| Integration (HTTP) | `tests/Catsheet.Api.Tests/Integration/*` | Pipeline lengkap: auth tiap scheme, 401 vs 403, validasi 400, ProblemDetails. |

## Pola yang layak dibahas di interview

- **AAA (Arrange, Act, Assert)**. Satu perilaku per test. Nama test menjelaskan perilaku (`Reserve_melebihi_stok_ditolak_dan_stok_tidak_berubah`).
- **Mock secukupnya.** Mock cuma di batas sistem (repository/DB, jam, HTTP). `OrderServiceTests` sengaja pakai `DiscountResolver` asli. Terlalu banyak mock bikin test cuma mengulang implementasi.
- **Jam jangan `DateTime.Now`.** Inject `TimeProvider`, lalu di test pakai `FakeTimeProvider`. Domain test juga punya contoh bikin `TimeProvider` palsu sendiri (`FixedClock`), sekalian contoh override abstract class.
- **Contract test = LSP di dunia nyata.** Kalau implementasi baru (misal Dapper) ditambah, cukup bikin subclass 5 baris.
- **SQLite in-memory > EF InMemory provider.** Provider InMemory bukan relational (tidak ada constraint, transaksi, SQL). SQLite in-memory tetap DB beneran. Untuk paritas penuh dengan production, pakai Testcontainers (Postgres/SQL Server di Docker), sama seperti di Java.
- **`TestContext.Current.CancellationToken`.** xUnit v3 punya analyzer (xUnit1051) yang mewajibkan token ini diteruskan ke method async, supaya test bisa dibatalkan rapi. Di repo ini analyzer warning dijadikan error.
- **Integration test ≠ lambat.** `WebApplicationFactory` menjalankan app di memori (TestServer), tanpa port. `IClassFixture` bikin satu app dipakai bareng satu class.

## Gotcha nyata yang ketemu saat bikin repo ini

`[InlineData(1.015)]` untuk parameter `decimal` → nilai yang masuk `1.01499999…` (double), hasil pembulatan salah dan test merah. Solusinya `TheoryData<decimal, decimal>` (lihat `MoneyTests.RoundingCases`).
