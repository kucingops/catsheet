using Catsheet.Domain.Catalog;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Tests;

/// <summary>
/// Test Data Builder / Object Mother: bikin object valid dengan default yang masuk akal,
/// test cukup override yang relevan. Bikin test pendek dan fokus.
/// </summary>
internal static class TestData
{
    public static PhysicalProduct Book(decimal price = 100_000m, int stock = 10, decimal weightKg = 0.4m) =>
        PhysicalProduct.Create("Clean Code", Money.Idr(price), stock, weightKg);

    public static DigitalProduct Ebook(decimal price = 50_000m) =>
        DigitalProduct.Create("Clean Code (PDF)", Money.Idr(price), "https://example.com/clean-code.pdf");
}

/// <summary>
/// Jam palsu buatan sendiri: turunkan abstract class <see cref="TimeProvider"/> dan override
/// method yang perlu. (Di project Api.Tests dipakai FakeTimeProvider dari Microsoft.)
/// </summary>
internal sealed class FixedClock(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now.ToUniversalTime();
    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}
