using Catsheet.Api.Application;
using Catsheet.Domain.Catalog;
using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace Catsheet.Api.Tests.Unit;

public class OrderServiceTests
{
    private readonly IProductRepository _repo = Substitute.For<IProductRepository>();
    // FakeTimeProvider: jam yang bisa diatur/dimajukan di test (Java: Clock.fixed(...)).
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 11, 21, 9, 0, 0, TimeSpan.Zero));
    private readonly OrderService _sut;

    private readonly PhysicalProduct _book = PhysicalProduct.Create("Buku", Money.Idr(100_000), stock: 2, weightKg: 1);

    public OrderServiceTests()
    {
        _repo.FindByIdAsync(_book.Id, Arg.Any<CancellationToken>()).Returns(_book);
        // Pakai implementasi ASLI DiscountResolver (bukan mock): mock secukupnya saja,
        // cuma untuk batas sistem (DB, jam, HTTP), bukan untuk semua class.
        _sut = new OrderService(_repo, new DiscountResolver(_clock));
    }

    private QuoteRequest Cart(int qty, string? code = null) => new([new CartItem(_book.Id, qty)], code);

    [Fact]
    public async Task Quote_tidak_mengubah_stok()
    {
        var quote = await _sut.QuoteAsync(Cart(2, "PCT10"), TestContext.Current.CancellationToken);

        Assert.Equal(200_000m, quote.Subtotal);
        Assert.Equal(20_000m, quote.Discount);
        Assert.Equal(10_000m, quote.Shipping);
        Assert.Equal(190_000m, quote.Total);
        Assert.Equal(2, _book.Stock);
        await _repo.DidNotReceiveWithAnyArgs().UpdateAsync(default!, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task HappyHour_hanya_berlaku_di_jamnya()
    {
        var pagi = await _sut.QuoteAsync(Cart(1, "HAPPY20"), TestContext.Current.CancellationToken);

        _clock.Advance(TimeSpan.FromHours(3)); // jam 12:00
        var siang = await _sut.QuoteAsync(Cart(1, "HAPPY20"), TestContext.Current.CancellationToken);

        Assert.Equal(0m, pagi.Discount);
        Assert.Equal(20_000m, siang.Discount);
    }

    [Fact]
    public async Task Checkout_mengurangi_stok_dan_menyimpan()
    {
        var result = await _sut.CheckoutAsync(Cart(2), TestContext.Current.CancellationToken);

        Assert.Equal("Submitted", result.Status);
        Assert.Equal(0, _book.Stock);
        await _repo.Received(1).UpdateAsync(_book, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Checkout_stok_kurang_gagal_tanpa_menyimpan()
    {
        await Assert.ThrowsAsync<DomainException>(() => _sut.CheckoutAsync(Cart(3), TestContext.Current.CancellationToken));
        await _repo.DidNotReceiveWithAnyArgs().UpdateAsync(default!, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Kode_diskon_tidak_dikenal_ditolak()
    {
        await Assert.ThrowsAsync<DomainException>(() => _sut.QuoteAsync(Cart(1, "GRATIS"), TestContext.Current.CancellationToken));
    }
}
