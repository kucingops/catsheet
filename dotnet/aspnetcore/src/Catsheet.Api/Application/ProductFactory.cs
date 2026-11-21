using Catsheet.Domain.Catalog;
using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Api.Application;

/// <summary>
/// FACTORY: satu pintu untuk bikin subtype Product dari request.
/// Switch expression + pattern matching = pengganti if/else berantai.
/// </summary>
public static class ProductFactory
{
    public static Product Create(CreateProductRequest r)
    {
        var price = new Money(r.Price, r.Currency);
        return r.Kind switch
        {
            "Physical" when r.WeightKg is { } w => PhysicalProduct.Create(r.Name, price, r.Stock, w),
            "Physical" => throw new DomainException("WeightKg wajib untuk produk fisik."),
            "Digital" when r.DownloadUrl is { Length: > 0 } url => DigitalProduct.Create(r.Name, price, url),
            "Digital" => throw new DomainException("DownloadUrl wajib untuk produk digital."),
            _ => throw new DomainException($"Kind '{r.Kind}' tidak dikenal."),
        };
    }
}
