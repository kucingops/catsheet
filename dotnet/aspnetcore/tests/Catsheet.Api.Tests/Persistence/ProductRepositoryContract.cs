using Catsheet.Domain.Catalog;
using Catsheet.Domain.Pricing;

namespace Catsheet.Api.Tests.Persistence;

/// <summary>
/// CONTRACT TEST (inheritance dipakai di test!). Semua implementasi IProductRepository
/// harus lolos test yang SAMA. Subclass cukup menyediakan instance repository-nya.
/// Ini membuktikan Liskov Substitution: implementasi mana pun bisa saling ganti.
/// IAsyncLifetime ≈ @BeforeEach/@AfterEach versi async.
/// </summary>
public abstract class ProductRepositoryContract : IAsyncLifetime
{
    protected IProductRepository Repo { get; private set; } = null!;

    /// <summary>Factory method: tiap subclass bikin repository versinya sendiri.</summary>
    protected abstract Task<IProductRepository> CreateRepositoryAsync();

    /// <summary>Beberapa implementasi (EF) perlu "context baru" untuk membuktikan data benar-benar tersimpan.</summary>
    protected virtual Task<IProductRepository> FreshRepositoryAsync() => Task.FromResult(Repo);

    public async ValueTask InitializeAsync() => Repo = await CreateRepositoryAsync();

    public virtual ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Add_lalu_Find_mengembalikan_subtype_yang_benar()
    {
        var book = PhysicalProduct.Create("Buku", Money.Idr(99_000), 3, 0.5m);
        var ebook = DigitalProduct.Create("E-book", Money.Idr(49_000), "https://example.com/e.pdf");

        await Repo.AddAsync(book, Ct);
        await Repo.AddAsync(ebook, Ct);
        var fresh = await FreshRepositoryAsync();

        var loadedBook = Assert.IsType<PhysicalProduct>(await fresh.FindByIdAsync(book.Id, Ct));
        Assert.Equal(0.5m, loadedBook.WeightKg);
        Assert.Equal(Money.Idr(99_000), loadedBook.Price);
        Assert.Equal(3, loadedBook.Stock);

        var loadedEbook = Assert.IsType<DigitalProduct>(await fresh.FindByIdAsync(ebook.Id, Ct));
        Assert.Equal("https://example.com/e.pdf", loadedEbook.DownloadUrl);
    }

    [Fact]
    public async Task Find_id_tidak_ada_mengembalikan_null()
    {
        Assert.Null(await Repo.FindByIdAsync(Guid.NewGuid(), Ct));
    }

    [Fact]
    public async Task List_urut_berdasarkan_nama()
    {
        await Repo.AddAsync(PhysicalProduct.Create("Zebra", Money.Idr(1), 1, 1), Ct);
        await Repo.AddAsync(PhysicalProduct.Create("Apel", Money.Idr(1), 1, 1), Ct);

        var names = (await (await FreshRepositoryAsync()).ListAsync(Ct)).Select(p => p.Name);

        Assert.Equal(["Apel", "Zebra"], names);
    }

    [Fact]
    public async Task Update_menyimpan_perubahan_state()
    {
        var book = PhysicalProduct.Create("Buku", Money.Idr(10_000), 1, 1);
        await Repo.AddAsync(book, Ct);

        var loaded = (await Repo.FindByIdAsync(book.Id, Ct))!;
        loaded.Restock(9);
        loaded.ChangePrice(Money.Idr(12_500));
        await Repo.UpdateAsync(loaded, Ct);

        var again = (await (await FreshRepositoryAsync()).FindByIdAsync(book.Id, Ct))!;
        Assert.Equal(10, again.Stock);
        Assert.Equal(12_500m, again.Price.Amount);
    }

    [Fact]
    public async Task Delete_menghapus_dan_lapor_hasil()
    {
        var book = PhysicalProduct.Create("Buku", Money.Idr(10_000), 1, 1);
        await Repo.AddAsync(book, Ct);

        Assert.True(await Repo.DeleteAsync(book.Id, Ct));
        Assert.False(await Repo.DeleteAsync(book.Id, Ct));
        Assert.Null(await (await FreshRepositoryAsync()).FindByIdAsync(book.Id, Ct));
    }
}
