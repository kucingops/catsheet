using Catsheet.Domain.Catalog;
using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Ordering;

public enum OrderStatus { Draft, Submitted, Paid, Cancelled }

/// <summary>
/// Satu baris order. <c>sealed record</c> (reference type) = immutable data carrier.
/// Ubah qty pakai <c>with</c> expression: <c>line with { Quantity = 3 }</c> (copy + modifikasi).
/// </summary>
public sealed record OrderLine(Guid ProductId, string ProductName, Money UnitPrice, int Quantity, Money Shipping)
{
    public Money LineTotal => UnitPrice * Quantity;
}

/// <summary>
/// AGGREGATE ROOT. Koleksi internal <c>private</c>; dunia luar cuma lihat
/// <see cref="IReadOnlyList{T}"/>. Semua perubahan lewat method yang menjaga invariant
/// dan transisi status (state machine sederhana).
/// </summary>
public sealed class Order : Entity<Guid>
{
    private readonly List<OrderLine> _lines = [];
    private IDiscountPolicy _discount = NoDiscount.Instance;

    public string Currency { get; }
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();

    public Order(string currency = "IDR")
    {
        Id = Guid.CreateVersion7();
        Currency = currency;
    }

    public Money Subtotal => _lines.Select(l => l.LineTotal).Sum(Currency);
    public Money Shipping => _lines.Select(l => l.Shipping).Sum(Currency);
    public Money Discount => _discount.Calculate(this);
    public Money Total => Subtotal - Discount + Shipping;
    public string DiscountCode => _discount.Code;

    public void AddItem(Product product, int quantity)
    {
        EnsureStatus(OrderStatus.Draft);
        if (quantity <= 0) throw new DomainException("Quantity harus > 0.");
        if (product.Price.Currency != Currency) throw new DomainException("Currency produk beda dengan order.");

        var idx = _lines.FindIndex(l => l.ProductId == product.Id);
        if (idx >= 0)
        {
            var existing = _lines[idx];
            _lines[idx] = existing with { Quantity = existing.Quantity + quantity };
        }
        else
        {
            // Polymorphism: Shipping dihitung sesuai tipe runtime (Physical/Digital).
            _lines.Add(new OrderLine(product.Id, product.Name, product.Price, quantity, product.ShippingCost()));
        }
    }

    public void ApplyDiscount(IDiscountPolicy policy)
    {
        EnsureStatus(OrderStatus.Draft);
        _discount = policy ?? throw new ArgumentNullException(nameof(policy));
    }

    public void Submit()
    {
        EnsureStatus(OrderStatus.Draft);
        if (_lines.Count == 0) throw new DomainException("Order kosong tidak bisa di-submit.");
        Status = OrderStatus.Submitted;
    }

    public void MarkPaid()
    {
        EnsureStatus(OrderStatus.Submitted);
        Status = OrderStatus.Paid;
    }

    public void Cancel()
    {
        // Pattern matching: `is` dengan `or` pattern.
        if (Status is OrderStatus.Paid or OrderStatus.Cancelled)
            throw new DomainException($"Order {Status} tidak bisa dibatalkan.");
        Status = OrderStatus.Cancelled;
    }

    private void EnsureStatus(OrderStatus expected)
    {
        if (Status != expected)
            throw new DomainException($"Aksi ini butuh status {expected}, sekarang {Status}.");
    }
}
