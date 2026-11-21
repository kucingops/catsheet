using Catsheet.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace Catsheet.Api.Persistence.EfCore;

/// <summary>
/// Repository di atas EF Core. Scoped (1 instance per HTTP request), sama seperti DbContext.
/// Catatan: DbContext sendiri sudah repository + unit of work; wrapper ini ada supaya
/// domain cukup kenal <see cref="IProductRepository"/> dan implementasi bisa ditukar.
/// </summary>
public sealed class EfProductRepository(CatalogDbContext db) : IProductRepository
{
    public Task<Product?> FindByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default) =>
        await db.Products
            .AsNoTracking()          // read-only: skip change tracking, lebih hemat
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

    public async Task AddAsync(Product product, CancellationToken ct = default)
    {
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Product product, CancellationToken ct = default)
    {
        // Entity hasil FindByIdAsync sudah di-track → cukup SaveChanges (dirty checking, mirip Hibernate).
        if (db.Entry(product).State == EntityState.Detached) db.Products.Update(product);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default) =>
        // ExecuteDeleteAsync: langsung DELETE ... WHERE, tanpa load entity dulu (bulk operation).
        await db.Products.Where(p => p.Id == id).ExecuteDeleteAsync(ct) > 0;
}
