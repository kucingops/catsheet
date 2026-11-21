using Catsheet.Domain.Common;
using Catsheet.Domain.Ordering;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Tests;

public class OrderTests
{
    [Fact]
    public void Total_subtotal_dikurangi_diskon_ditambah_ongkir()
    {
        // Arrange
        var order = new Order();
        order.AddItem(TestData.Book(price: 100_000, weightKg: 0.5m), 2); // ongkir 10_000 per line
        order.AddItem(TestData.Ebook(price: 50_000), 1);                 // ongkir 0
        order.ApplyDiscount(new PercentageDiscount(10));

        // Act + Assert
        Assert.Equal(250_000m, order.Subtotal.Amount);
        Assert.Equal(25_000m, order.Discount.Amount);
        Assert.Equal(10_000m, order.Shipping.Amount);
        Assert.Equal(235_000m, order.Total.Amount);
    }

    [Fact]
    public void Produk_yang_sama_digabung_ke_satu_line()
    {
        var order = new Order();
        var book = TestData.Book();

        order.AddItem(book, 1);
        order.AddItem(book, 2);

        var line = Assert.Single(order.Lines);
        Assert.Equal(3, line.Quantity);
    }

    [Fact]
    public void Lines_tidak_bisa_dimodifikasi_dari_luar()
    {
        var order = new Order();
        order.AddItem(TestData.Book(), 1);

        // IReadOnlyList yang dikembalikan adalah wrapper read-only, bukan List asli.
        var asList = Assert.IsAssignableFrom<IList<OrderLine>>(order.Lines);
        Assert.Throws<NotSupportedException>(() => asList.Clear());
    }

    [Fact]
    public void State_machine_Draft_Submitted_Paid()
    {
        var order = new Order();
        order.AddItem(TestData.Book(), 1);

        order.Submit();
        order.MarkPaid();

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Throws<DomainException>(() => order.Cancel());
        Assert.Throws<DomainException>(() => order.AddItem(TestData.Book(), 1));
    }

    [Fact]
    public void Order_kosong_tidak_bisa_submit()
    {
        Assert.Throws<DomainException>(() => new Order().Submit());
    }

    [Fact]
    public void Currency_harus_sama()
    {
        var order = new Order("USD");
        Assert.Throws<DomainException>(() => order.AddItem(TestData.Book(), 1));
    }
}
