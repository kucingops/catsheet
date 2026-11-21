# 01 · C# buat orang Java

Kalau sudah 4 tahun di Java, 80% konsep langsung kepakai. Yang beda kebanyakan "gula" bahasa dan beberapa keputusan desain runtime. Ini yang paling sering bikin orang Java kaget.

## Peta cepat

| Java | C# / .NET | Catatan |
|---|---|---|
| JVM, bytecode | CLR, IL | Sama-sama JIT. .NET juga punya Native AOT (mirip GraalVM native-image). |
| Maven/Gradle, `pom.xml` | MSBuild, `.csproj`, NuGet | `Directory.Build.props` ≈ parent POM, `Directory.Packages.props` ≈ BOM / `dependencyManagement`. |
| `package` | `namespace` | Namespace tidak harus sama dengan folder (tapi biasakan sama). |
| package-private | `internal` | `internal` = satu assembly (satu `.csproj`). Test bisa akses lewat `InternalsVisibleTo`. |
| `final class` | `sealed class` | |
| `final` field | `readonly` field / `init` property | |
| getter/setter (atau Lombok) | **property** `public int Stock { get; private set; }` | Tidak perlu Lombok. |
| `record` (Java 16+) | `record` (class) dan `record struct` | C# record punya `with` expression untuk copy-and-modify. |
| `equals/hashCode` | `Equals/GetHashCode` + bisa overload `==` | Operator overloading ada di C#, tidak ada di Java. |
| Checked exception | **Tidak ada** | Semua exception unchecked. Tidak ada `throws`. |
| Stream API | LINQ | `Where`=filter, `Select`=map, `SelectMany`=flatMap, `Aggregate`=reduce, `ToList()`=collect. |
| `Optional<T>` | Nullable reference types (`string?`) | Null-safety dicek compiler (warning, di sini dijadikan error). |
| `CompletableFuture` / virtual threads | `async`/`await` + `Task` | Async di .NET "menular" ke atas (async all the way). |
| Generics (type erasure) | Generics **reified** | `List<int>` beneran list int (tanpa boxing), `typeof(T)` bisa dipakai saat runtime. |
| Semua object di heap (kecuali primitif) | `struct` = value type | `Money` di repo ini `readonly record struct`. |
| Static utility | **Extension members** | C# 14: blok `extension(T x) { ... }`, lihat `Pricing/Money.cs`. |
| Lambda + functional interface | Lambda + delegate (`Func<>`, `Action<>`) | Tidak perlu bikin interface untuk tiap bentuk lambda. |
| `try-with-resources` | `using` / `await using` | Untuk `IDisposable` / `IAsyncDisposable`. |
| `switch` pattern (Java 21) | switch expression + pattern matching | Sudah ada sejak C# 8, makin lengkap tiap versi. |
| Annotation | Attribute | `[Authorize]`, `[Fact]`, `[Required]`. |

## Fitur C# modern yang dipakai di repo ini

| Fitur | Versi | Contoh di repo |
|---|---|---|
| Top-level statements | C# 9 | `Program.cs` tanpa `class Program` |
| `record`, `with` | C# 9/10 | `OrderLine`, DTO di `Application/Dtos.cs` |
| `required` member | C# 11 | `JwtOptions`, `ApiKeyClient` |
| Primary constructor di class | C# 12 | `CatalogService(IProductRepository products, ...)` |
| Collection expression `[...]` | C# 12 | `private readonly List<OrderLine> _lines = [];` |
| `field` keyword | C# 14 | `Product.Stock` (validasi di setter tanpa deklarasi field manual) |
| Extension members | C# 14 | `MoneyExtensions`, `SecurityExtensions`, `PersistenceExtensions` |
| `Guid.CreateVersion7()` | .NET 9 | UUIDv7, urut waktu → index DB lebih rapi |
| `TimeProvider` | .NET 8 | Abstraksi jam, padanan `java.time.Clock` |

## Gotcha yang sering ditanya

- **`decimal` vs `double`**: uang selalu `decimal` (Java: `BigDecimal`). Tapi `decimal` tidak bisa ditulis di attribute. `[InlineData(1.015)]` itu `double`, hasilnya `1.01499999…`. Contoh kasus nyatanya ada di `MoneyTests.cs`.
- **`struct` di-copy saat di-assign**. Ubah field di copy tidak mengubah aslinya. Makanya value object dibuat `readonly`.
- **`async void`** cuma untuk event handler. Selain itu pakai `async Task`, kalau tidak exception-nya hilang.
- **`.Result` / `.Wait()`** pada Task bisa deadlock dan memblokir thread. Pakai `await`.
- **`IEnumerable` itu lazy** (seperti Stream). Kalau di-enumerate dua kali, query jalan dua kali. Materialisasi dengan `ToList()`.
- **`==` pada string** membandingkan isi (bukan referensi seperti Java). Pada class biasa `==` membandingkan referensi, kecuali di-overload.
