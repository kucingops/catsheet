using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Catalog;

/// <summary>
/// INHERITANCE. <c>sealed</c> = tidak bisa diturunkan lagi (Java: <c>final class</c>).
/// </summary>
public sealed class PhysicalProduct : Product
{
    public const decimal RatePerKg = 10_000m;

    public decimal WeightKg { get; private set; }

    public override string Kind => "Physical";

    private PhysicalProduct() { } // untuk EF Core

    public PhysicalProduct(Guid id, string name, Money price, int stock, decimal weightKg)
        : base(id, name, price, stock) // Java: super(...)
    {
        if (weightKg <= 0) throw new DomainException("Berat harus > 0.");
        WeightKg = weightKg;
    }

    public static PhysicalProduct Create(string name, Money price, int stock, decimal weightKg) =>
        new(Guid.CreateVersion7(), name, price, stock, weightKg); // UUIDv7: urut waktu, ramah index DB

    public override Money ShippingCost() =>
        new(Math.Ceiling(WeightKg) * RatePerKg, Price.Currency);
}
