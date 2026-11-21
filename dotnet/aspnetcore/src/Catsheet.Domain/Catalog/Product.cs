using Catsheet.Domain.Common;
using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Catalog;

/// <summary>
/// ABSTRACT CLASS + ENCAPSULATION.
/// - Setter <c>private</c>: state cuma berubah lewat method yang menjaga aturan bisnis.
/// - <c>abstract</c> member wajib di-override subclass (polymorphism).
/// </summary>
public abstract class Product : Entity<Guid>
{
    public const int MaxNameLength = 100;

    public string Name { get; private set; } = string.Empty;
    public Money Price { get; private set; }

    // C# 14 `field` keyword: akses backing field otomatis tanpa deklarasi field manual.
    // Validasi tetap jalan walau property di-set dari dalam class.
    public int Stock
    {
        get;
        private set => field = value >= 0 ? value : throw new DomainException("Stok tidak boleh negatif.");
    }

    /// <summary>Discriminator untuk persistence ("Physical"/"Digital").</summary>
    public abstract string Kind { get; }

    // EF Core (dan JPA) butuh constructor tanpa parameter. `protected` supaya tidak dipakai sembarangan.
    protected Product() { }

    protected Product(Guid id, string name, Money price, int stock)
    {
        Id = id;
        Rename(name);
        ChangePrice(price);
        Stock = stock;
    }

    public void Rename(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name); // guard clause bawaan BCL
        if (name.Length > MaxNameLength)
            throw new DomainException($"Nama maksimal {MaxNameLength} karakter.");
        Name = name.Trim();
    }

    public void ChangePrice(Money price)
    {
        if (price.Amount == 0) throw new DomainException("Harga tidak boleh nol.");
        Price = price;
    }

    public void Restock(int qty)
    {
        if (qty <= 0) throw new DomainException("Qty restock harus > 0.");
        Stock += qty;
    }

    /// <summary>TEMPLATE METHOD: alur umum di base class, detail di subclass lewat hook.</summary>
    public void Reserve(int qty)
    {
        if (qty <= 0) throw new DomainException("Qty harus > 0.");
        if (!HasUnlimitedStock)
        {
            if (Stock < qty) throw new DomainException($"Stok '{Name}' kurang. Sisa {Stock}.");
            Stock -= qty;
        }
    }

    /// <summary>Hook: default false, boleh di-override (<c>virtual</c>).</summary>
    protected virtual bool HasUnlimitedStock => false;

    /// <summary>Polymorphism: tiap jenis produk hitung ongkir sendiri.</summary>
    public abstract Money ShippingCost();

    public override string ToString() => $"{Kind}:{Name} ({Price})";
}
