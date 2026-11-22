using Catsheet.Domain.Ordering;

namespace Catsheet.Domain.Pricing;

/// <summary>
/// STRATEGY PATTERN via interface. Order tidak peduli diskon jenis apa; cukup panggil
/// <see cref="Calculate"/>. Tambah diskon baru = tambah class baru, tanpa ubah Order
/// (Open/Closed Principle).
/// </summary>
public interface IDiscountPolicy
{
    string Code { get; }
    Money Calculate(Order order);

    // Default interface method (C# 8+, Java 8+ juga punya `default`).
    string Describe() => $"Diskon {Code}";
}

public sealed class NoDiscount : IDiscountPolicy
{
    // Singleton sederhana: satu instance cukup karena stateless.
    public static readonly NoDiscount Instance = new();
    private NoDiscount() { }

    public string Code => "NONE";
    public Money Calculate(Order order) => Money.Zero(order.Currency);
}

/// <summary>Primary constructor (C# 12): parameter langsung jadi "field" yang ditangkap.</summary>
public sealed class PercentageDiscount(decimal percent) : IDiscountPolicy
{
    public decimal Percent { get; } = percent is > 0 and <= 100
        ? percent
        : throw new ArgumentOutOfRangeException(nameof(percent));

    public string Code => $"PCT{Percent:0}";
    public Money Calculate(Order order) => order.Subtotal * (Percent / 100m);
    public string Describe() => $"Diskon {Percent}%";
}

/// <summary>Beli N gratis 1 untuk produk tertentu (yang termurah per kelompok N+1).</summary>
public sealed class BuyNGetOneFree(Guid productId, int n) : IDiscountPolicy
{
    public string Code => $"B{n}G1";

    public Money Calculate(Order order)
    {
        var line = order.Lines.FirstOrDefault(l => l.ProductId == productId);
        if (line is null) return Money.Zero(order.Currency);
        var freeItems = line.Quantity / (n + 1);
        return line.UnitPrice * freeItems;
    }
}

/// <summary>
/// Diskon yang tergantung waktu. Waktu di-inject lewat <see cref="TimeProvider"/>
/// (abstraksi jam bawaan .NET 8+) supaya bisa di-test dengan jam palsu.
/// Java padanannya: inject <c>java.time.Clock</c>.
/// </summary>
public sealed class HappyHourDiscount(TimeProvider clock, IDiscountPolicy inner, int startHour = 12, int endHour = 14)
    : IDiscountPolicy
{
    public string Code => $"HAPPY-{inner.Code}";

    public Money Calculate(Order order)
    {
        var hour = clock.GetLocalNow().Hour;
        return hour >= startHour && hour < endHour ? inner.Calculate(order) : Money.Zero(order.Currency);
    }
}
