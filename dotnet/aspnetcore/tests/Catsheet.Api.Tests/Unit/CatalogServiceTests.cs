using Catsheet.Api.Application;
using Catsheet.Domain.Catalog;
using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Catsheet.Api.Tests.Unit;

/// <summary>
/// UNIT TEST dengan MOCK. NSubstitute ≈ Mockito:
///   Substitute.For&lt;T&gt;()      ≈ mock(T.class)
///   x.Method().Returns(v)    ≈ when(x.method()).thenReturn(v)
///   x.Received().Method()    ≈ verify(x).method()
///   Arg.Is&lt;T&gt;(pred)        ≈ argThat(pred)
/// xUnit bikin instance class test BARU untuk tiap test → constructor = @BeforeEach.
/// </summary>
public class CatalogServiceTests
{
    private readonly IProductRepository _repo = Substitute.For<IProductRepository>();
    private readonly CatalogService _sut; // sut = system under test

    public CatalogServiceTests()
    {
        _sut = new CatalogService(_repo, NullLogger<CatalogService>.Instance);
    }

    [Fact]
    public async Task Create_physical_menyimpan_ke_repository()
    {
        var req = new CreateProductRequest("Physical", "Keyboard", 750_000, "IDR", Stock: 5, WeightKg: 1.2m);

        var result = await _sut.CreateAsync(req, TestContext.Current.CancellationToken);

        Assert.Equal("Physical", result.Kind);
        Assert.Equal(20_000m, result.ShippingCost); // ceil(1.2) * 10_000
        await _repo.Received(1).AddAsync(
            Arg.Is<Product>(p => p is PhysicalProduct && p.Name == "Keyboard"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Create_physical_tanpa_berat_ditolak_dan_tidak_menyimpan()
    {
        var req = new CreateProductRequest("Physical", "Keyboard", 750_000);

        await Assert.ThrowsAsync<DomainException>(() => _sut.CreateAsync(req, TestContext.Current.CancellationToken));

        await _repo.DidNotReceiveWithAnyArgs().AddAsync(default!, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Restock_mengubah_stok_lalu_update()
    {
        var product = PhysicalProduct.Create("Mouse", Money.Idr(100_000), 1, 0.2m);
        _repo.FindByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);

        var result = await _sut.RestockAsync(product.Id, 4, TestContext.Current.CancellationToken);

        Assert.Equal(5, result.Stock);
        await _repo.Received().UpdateAsync(product, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Restock_produk_tidak_ada_lempar_KeyNotFound()
    {
        _repo.FindByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Product?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.RestockAsync(Guid.NewGuid(), 1, TestContext.Current.CancellationToken));
    }
}
