using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Api.Application;

public interface IDiscountResolver
{
    IDiscountPolicy Resolve(string? code);
}

/// <summary>Kode voucher → strategy. Contoh DECORATOR: HappyHour membungkus PercentageDiscount.</summary>
public sealed class DiscountResolver(TimeProvider clock) : IDiscountResolver
{
    public IDiscountPolicy Resolve(string? code) => code?.Trim().ToUpperInvariant() switch
    {
        null or "" => NoDiscount.Instance,
        "PCT10" => new PercentageDiscount(10),
        "HAPPY20" => new HappyHourDiscount(clock, new PercentageDiscount(20)),
        _ => throw new DomainException($"Kode diskon '{code}' tidak valid."),
    };
}
