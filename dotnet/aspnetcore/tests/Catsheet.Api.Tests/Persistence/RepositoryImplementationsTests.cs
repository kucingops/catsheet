using Catsheet.Api.Persistence.Ado;
using Catsheet.Api.Persistence.EfCore;
using Catsheet.Api.Persistence.InMemory;
using Catsheet.Domain.Catalog;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Catsheet.Api.Tests.Persistence;

// Tiga subclass, nol test baru: semua [Fact] diwarisi dari ProductRepositoryContract.

public sealed class InMemoryProductRepositoryTests : ProductRepositoryContract
{
    protected override Task<IProductRepository> CreateRepositoryAsync() =>
        Task.FromResult<IProductRepository>(new InMemoryProductRepository());
}

/// <summary>
/// EF Core + SQLite in-memory: DB beneran (SQL, constraint, transaksi) tapi cepat dan
/// tanpa file. Lebih jujur daripada provider EF "InMemory" yang bukan relational.
/// Database hidup selama koneksi terbuka → koneksi dipegang sampai test selesai.
/// </summary>
public sealed class EfProductRepositoryTests : ProductRepositoryContract
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly List<CatalogDbContext> _contexts = [];

    private CatalogDbContext NewContext()
    {
        var ctx = new CatalogDbContext(new DbContextOptionsBuilder<CatalogDbContext>().UseSqlite(_conn).Options);
        _contexts.Add(ctx);
        return ctx;
    }

    protected override async Task<IProductRepository> CreateRepositoryAsync()
    {
        await _conn.OpenAsync();
        var ctx = NewContext();
        await ctx.Database.EnsureCreatedAsync();
        return new EfProductRepository(ctx);
    }

    // DbContext baru = cache (identity map) kosong → benar-benar baca dari DB.
    protected override Task<IProductRepository> FreshRepositoryAsync() =>
        Task.FromResult<IProductRepository>(new EfProductRepository(NewContext()));

    public override async ValueTask DisposeAsync()
    {
        foreach (var c in _contexts) await c.DisposeAsync();
        await _conn.DisposeAsync();
    }
}

/// <summary>
/// ADO.NET: repository buka-tutup koneksi sendiri, jadi pakai "shared cache" in-memory DB
/// dengan nama unik + 1 koneksi "penjaga" supaya DB tidak hilang di antara operasi.
/// </summary>
public sealed class AdoProductRepositoryTests : ProductRepositoryContract
{
    private readonly string _cs = $"Data Source=ado-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private SqliteConnection? _keepAlive;

    protected override async Task<IProductRepository> CreateRepositoryAsync()
    {
        _keepAlive = new SqliteConnection(_cs);
        await _keepAlive.OpenAsync();
        var repo = new AdoProductRepository(_cs);
        await repo.EnsureSchemaAsync();
        return repo;
    }

    public override async ValueTask DisposeAsync()
    {
        if (_keepAlive is not null) await _keepAlive.DisposeAsync();
    }
}
