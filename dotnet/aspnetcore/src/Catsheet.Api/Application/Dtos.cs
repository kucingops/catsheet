using System.ComponentModel.DataAnnotations;
using Catsheet.Domain.Catalog;

namespace Catsheet.Api.Application;

// DTO = record: ringkas, immutable, punya equality by value. (Java: record juga.)
// DataAnnotations divalidasi otomatis oleh minimal API validation (AddValidation, .NET 10+).

public sealed record CreateProductRequest(
    [property: Required, RegularExpression("^(Physical|Digital)$")] string Kind,
    [property: Required, StringLength(Product.MaxNameLength)] string Name,
    [property: Range(0.01, 1_000_000_000)] decimal Price,
    [property: Required, StringLength(3, MinimumLength = 3)] string Currency = "IDR",
    [property: Range(0, int.MaxValue)] int Stock = 0,
    decimal? WeightKg = null,
    [property: Url] string? DownloadUrl = null);

public sealed record RestockRequest([property: Range(1, 100_000)] int Quantity);

public sealed record ProductResponse(
    Guid Id, string Kind, string Name, decimal Price, string Currency, int Stock, decimal ShippingCost)
{
    // Static factory: mapping domain → DTO di satu tempat.
    public static ProductResponse From(Product p) =>
        new(p.Id, p.Kind, p.Name, p.Price.Amount, p.Price.Currency, p.Stock, p.ShippingCost().Amount);
}

public sealed record CartItem(Guid ProductId, [property: Range(1, 1000)] int Quantity);

public sealed record QuoteRequest([property: Required, MinLength(1)] List<CartItem> Items, string? DiscountCode = null);

public sealed record QuoteLine(Guid ProductId, string Name, int Quantity, decimal UnitPrice, decimal LineTotal);

public sealed record QuoteResponse(
    IReadOnlyList<QuoteLine> Lines, decimal Subtotal, decimal Discount, decimal Shipping, decimal Total,
    string Currency, string DiscountCode, string Status);
