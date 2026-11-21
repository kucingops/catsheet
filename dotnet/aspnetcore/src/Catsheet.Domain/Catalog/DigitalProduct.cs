using Catsheet.Domain.Pricing;

namespace Catsheet.Domain.Catalog;

public sealed class DigitalProduct : Product
{
    public string DownloadUrl { get; private set; } = string.Empty;

    public override string Kind => "Digital";

    // Override hook dari base: produk digital stoknya tak terbatas.
    protected override bool HasUnlimitedStock => true;

    private DigitalProduct() { }

    public DigitalProduct(Guid id, string name, Money price, string downloadUrl)
        : base(id, name, price, stock: 0)
    {
        if (!Uri.TryCreate(downloadUrl, UriKind.Absolute, out _))
            throw new Common.DomainException("DownloadUrl harus URL absolut.");
        DownloadUrl = downloadUrl;
    }

    public static DigitalProduct Create(string name, Money price, string downloadUrl) =>
        new(Guid.CreateVersion7(), name, price, downloadUrl);

    public override Money ShippingCost() => Money.Zero(Price.Currency);
}
