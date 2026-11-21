namespace Catsheet.Domain.Catalog;

/// <summary>
/// INTERFACE = kontrak. Domain cuma tahu kontrak ini; implementasinya (EF Core, ADO.NET,
/// in-memory) ada di layer infrastruktur. Ini Dependency Inversion (huruf D di SOLID).
/// Java/Spring padanannya: interface <c>ProductRepository</c> yang di-inject.
/// </summary>
public interface IProductRepository
{
    Task<Product?> FindByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default);
    Task AddAsync(Product product, CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
