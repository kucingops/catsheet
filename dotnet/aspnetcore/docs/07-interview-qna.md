# 07 · Pertanyaan interview .NET (jawaban singkat)

Jawaban pendek, lalu link ke kode/dok yang menjelaskan detailnya.

### Bahasa & runtime
1. **Value type vs reference type?** `struct` disimpan inline/di stack dan di-copy saat assign. `class` disimpan di heap dan yang di-copy referensinya. → [01](01-csharp-vs-java.md), `Money`.
2. **Boxing?** Value type dibungkus jadi object di heap (misal `int` → `object`). Ada biaya alokasi. Generics reified menghindarinya (`List<int>`).
3. **`IEnumerable` vs `IQueryable`?** `IEnumerable` jalan di memori (LINQ to Objects). `IQueryable` membangun expression tree yang diterjemahkan ke SQL (EF). Memanggil `.AsEnumerable()` terlalu cepat = tarik semua data ke memori.
4. **`async/await` itu multithreading?** Tidak harus. Saat menunggu I/O, thread dikembalikan ke pool. Kelanjutannya jalan di thread mana saja. Mirip virtual thread dari sisi efeknya (thread tidak ter-block), beda mekanisme.
5. **`Task` vs `ValueTask`?** `ValueTask` menghindari alokasi kalau hasilnya sering sinkron. Jangan di-await dua kali.
6. **`IDisposable` / `using`?** Melepas resource unmanaged secara deterministik (koneksi, file). GC tidak menjamin kapan finalizer jalan.
7. **`record` vs `class`?** Record = equality by value + `with` + `ToString` otomatis. Cocok untuk DTO dan value object.
8. **`readonly` vs `const`?** `const` di-inline saat compile (hanya primitif/string). `readonly` di-set saat runtime di constructor.
9. **`override` vs `new`?** `override` = polymorphism (method di-dispatch dinamis). `new` = menyembunyikan method base, dipilih berdasar tipe variabel. → [02](02-oop.md).
10. **Extension method/member?** Menambah method ke tipe tanpa mengubah atau menurunkannya. LINQ sendiri dibangun dari extension method.

### OOP / desain
11. **4 pilar OOP + contoh nyata?** → [02](02-oop.md), semua ada contoh di `Catsheet.Domain`.
12. **Abstract class vs interface?** → tabel di [02](02-oop.md).
13. **Composition over inheritance?** `HappyHourDiscount` membungkus `IDiscountPolicy`.
14. **Anemic vs rich domain model?** `Product`/`Order` menjaga invariant sendiri. Service cuma orkestrasi.
15. **SOLID?** → tabel di [02](02-oop.md), plus contract test sebagai bukti LSP.

### ASP.NET Core
16. **Lifetime DI & captive dependency?** → [06](06-di-pipeline.md).
17. **Urutan middleware penting?** Ya. Contoh: `UseAuthorization` sebelum `UseAuthentication` → user selalu dianggap anonim.
18. **Minimal API vs Controller?** → [06](06-di-pipeline.md).
19. **Global error handling?** `IExceptionHandler` + ProblemDetails. → `DomainExceptionHandler.cs`.
20. **Options pattern?** `IOptions` (sekali baca), `IOptionsSnapshot` (per request), `IOptionsMonitor` (live reload + callback).

### Security
21. **Authentication vs authorization; 401 vs 403?** → [04](04-security.md).
22. **Banyak cara login di satu app?** Daftarkan beberapa scheme + policy scheme untuk memilih. → `SecurityExtensions.cs`.
23. **Role vs claim vs policy?** Role = claim khusus. Policy = kumpulan requirement (bisa custom handler). → `PermissionAuthorization.cs`.
24. **JWT: simpan di mana di browser?** Idealnya jangan di `localStorage` (rawan XSS). Pola BFF: server memegang token, browser memegang cookie `HttpOnly`.
25. **Hash password?** `PasswordHasher<T>` (PBKDF2 + salt + iterasi). Jangan SHA-256 polos.

### Persistence
26. **EF Core vs Dapper vs ADO.NET?** → [05](05-persistence.md).
27. **N+1 dan cara fix?** `Include`, projection, split query.
28. **Change tracking & `AsNoTracking`?** → [05](05-persistence.md).
29. **Transaksi di EF?** `SaveChanges` atomic. Untuk lintas beberapa `SaveChanges` pakai `BeginTransaction` atau `TransactionScope`.
30. **Optimistic concurrency?** Row version / concurrency token → `DbUpdateConcurrencyException` → retry atau tampilkan konflik.

### Testing
31. **Unit vs integration test di .NET?** → [03](03-unit-test.md).
32. **Cara test kode yang bergantung waktu?** Inject `TimeProvider`, test pakai `FakeTimeProvider`.
33. **Cara test repository?** SQLite in-memory atau Testcontainers. Contract test untuk banyak implementasi.
34. **`WebApplicationFactory`?** Menjalankan app utuh di memori dan bisa override service/config untuk test.
