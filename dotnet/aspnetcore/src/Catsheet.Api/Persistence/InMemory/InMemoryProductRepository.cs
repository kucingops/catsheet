using System.Collections.Concurrent;
using Catsheet.Domain.Catalog;

namespace Catsheet.Api.Persistence.InMemory;

/// <summary>
/// TANPA PERSISTENCE: data cuma hidup di memori proses. Harus thread-safe karena
/// didaftarkan sebagai Singleton (satu instance dipakai semua request paralel).
/// Java padanannya: <c>ConcurrentHashMap</c> di dalam @Repository.
/// </summary>
public sealed class InMemoryProductRepository : IProductRepository
{
    private readonly ConcurrentDictionary<Guid, Product> _store = new();

    public Task<Product?> FindByIdAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(_store.GetValueOrDefault(id));

    public Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Product>>(_store.Values.OrderBy(p => p.Name).ToList());

    public Task AddAsync(Product product, CancellationToken ct = default)
    {
        if (!_store.TryAdd(product.Id, product))
            throw new InvalidOperationException($"Product {product.Id} sudah ada.");
        return Task.CompletedTask;
    }

    // Object disimpan by reference, jadi perubahan sudah "tersimpan". Tetap di-set ulang
    // supaya perilakunya sama dengan implementasi lain (kontrak interface).
    public Task UpdateAsync(Product product, CancellationToken ct = default)
    {
        _store[product.Id] = product;
        return Task.CompletedTask;
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(_store.TryRemove(id, out _));
}
