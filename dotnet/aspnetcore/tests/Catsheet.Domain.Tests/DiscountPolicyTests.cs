using Catsheet.Domain.Ordering;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Tests;

public class DiscountPolicyTests
{
    private static Order OrderWith(int qty, decimal price = 10_000)
    {
        var order = new Order();
        order.AddItem(TestData.Ebook(price), qty);
        return order;
    }

    [Fact]
    public void NoDiscount_selalu_nol()
    {
        Assert.Equal(0m, NoDiscount.Instance.Calculate(OrderWith(3)).Amount);
    }

    [Theory]
    [InlineData(10, 3_000)]
    [InlineData(50, 15_000)]
    [InlineData(100, 30_000)]
    public void PercentageDiscount(decimal percent, decimal expected)
    {
        Assert.Equal(expected, new PercentageDiscount(percent).Calculate(OrderWith(3)).Amount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void PercentageDiscount_di_luar_range_ditolak(decimal percent)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new PercentageDiscount(percent));
    }

    [Theory]
    [InlineData(2, 0)]
    [InlineData(3, 1)] // beli 2 gratis 1
    [InlineData(7, 2)]
    public void BuyNGetOneFree(int qty, int expectedFreeItems)
    {
        var order = OrderWith(qty);
        var policy = new BuyNGetOneFree(order.Lines[0].ProductId, n: 2);

        Assert.Equal(expectedFreeItems * 10_000m, policy.Calculate(order).Amount);
    }

    [Theory]
    [InlineData(11, 0)]      // sebelum jam 12
    [InlineData(12, 6_000)]  // masuk happy hour
    [InlineData(13, 6_000)]
    [InlineData(14, 0)]      // jam 14 sudah lewat (end exclusive)
    public void HappyHour_tergantung_jam(int hour, decimal expected)
    {
        var clock = new FixedClock(new DateTimeOffset(2026, 1, 1, hour, 30, 0, TimeSpan.Zero));
        IDiscountPolicy policy = new HappyHourDiscount(clock, new PercentageDiscount(20));

        Assert.Equal(expected, policy.Calculate(OrderWith(3)).Amount);
    }

    [Fact]
    public void Default_interface_method_bisa_dioverride()
    {
        IDiscountPolicy pct = new PercentageDiscount(10);
        IDiscountPolicy none = NoDiscount.Instance;

        Assert.Equal("Diskon 10%", pct.Describe()); // implementasi class
        Assert.Equal("Diskon NONE", none.Describe()); // default dari interface
    }

    [Fact]
    public void Strategy_bisa_diganti_saat_runtime()
    {
        var order = OrderWith(3);
        order.ApplyDiscount(new PercentageDiscount(10));
        var before = order.Total;

        order.ApplyDiscount(new BuyNGetOneFree(order.Lines[0].ProductId, 2));

        Assert.NotEqual(before, order.Total);
        Assert.Equal("B2G1", order.DiscountCode);
    }
}
