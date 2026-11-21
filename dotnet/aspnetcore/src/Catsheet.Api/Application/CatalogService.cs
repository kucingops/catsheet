using Catsheet.Domain.Catalog;

namespace Catsheet.Api.Application;

/// <summary>
/// APPLICATION SERVICE: orkestrasi use case. Logika bisnis inti tetap di domain object
/// (Product.Restock dll), service cuma ambil → panggil → simpan.
/// Dependency masuk lewat constructor (constructor injection), sama seperti Spring.
/// </summary>
public sealed class CatalogService(IProductRepository products, ILogger<CatalogService> logger)
{
    public async Task<IReadOnlyList<ProductResponse>> ListAsync(CancellationToken ct = default) =>
        (await products.ListAsync(ct)).Select(ProductResponse.From).ToList();

    public async Task<ProductResponse?> GetAsync(Guid id, CancellationToken ct = default) =>
        await products.FindByIdAsync(id, ct) is { } p ? ProductResponse.From(p) : null;

    public async Task<ProductResponse> CreateAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        var product = ProductFactory.Create(request);
        await products.AddAsync(product, ct);
        logger.LogInformation("Product {ProductId} ({Kind}) dibuat", product.Id, product.Kind); // structured logging
        return ProductResponse.From(product);
    }

    public async Task<ProductResponse> RestockAsync(Guid id, int qty, CancellationToken ct = default)
    {
        var product = await products.FindByIdAsync(id, ct)
                      ?? throw new KeyNotFoundException($"Product {id} tidak ditemukan.");
        product.Restock(qty);
        await products.UpdateAsync(product, ct);
        return ProductResponse.From(product);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default) => products.DeleteAsync(id, ct);
}
