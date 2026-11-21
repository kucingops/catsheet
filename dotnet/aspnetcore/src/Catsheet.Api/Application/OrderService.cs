using Catsheet.Domain.Catalog;
using Catsheet.Domain.Ordering;

namespace Catsheet.Api.Application;

public sealed class OrderService(IProductRepository products, IDiscountResolver discounts)
{
    /// <summary>Hitung harga tanpa mengubah stok.</summary>
    public async Task<QuoteResponse> QuoteAsync(QuoteRequest request, CancellationToken ct = default)
    {
        var (order, _) = await BuildAsync(request, ct);
        return ToResponse(order);
    }

    /// <summary>Checkout: reserve stok tiap produk lalu simpan.</summary>
    public async Task<QuoteResponse> CheckoutAsync(QuoteRequest request, CancellationToken ct = default)
    {
        var (order, loaded) = await BuildAsync(request, ct);
        order.Submit();

        foreach (var item in request.Items)
            loaded[item.ProductId].Reserve(item.Quantity); // lempar DomainException kalau stok kurang

        // Catatan: di sistem beneran, ini harus 1 transaksi + optimistic concurrency
        // (EF: [Timestamp]/RowVersion, JPA: @Version) supaya tidak oversell.
        foreach (var p in loaded.Values) await products.UpdateAsync(p, ct);
        return ToResponse(order);
    }

    private async Task<(Order, Dictionary<Guid, Product>)> BuildAsync(QuoteRequest request, CancellationToken ct)
    {
        var order = new Order();
        var loaded = new Dictionary<Guid, Product>();
        foreach (var item in request.Items)
        {
            if (!loaded.TryGetValue(item.ProductId, out var product))
            {
                product = await products.FindByIdAsync(item.ProductId, ct)
                          ?? throw new KeyNotFoundException($"Product {item.ProductId} tidak ditemukan.");
                loaded[product.Id] = product;
            }
            order.AddItem(product, item.Quantity);
        }
        order.ApplyDiscount(discounts.Resolve(request.DiscountCode));
        return (order, loaded);
    }

    private static QuoteResponse ToResponse(Order o) => new(
        o.Lines.Select(l => new QuoteLine(l.ProductId, l.ProductName, l.Quantity, l.UnitPrice.Amount, l.LineTotal.Amount)).ToList(),
        o.Subtotal.Amount, o.Discount.Amount, o.Shipping.Amount, o.Total.Amount,
        o.Currency, o.DiscountCode, o.Status.ToString());
}
