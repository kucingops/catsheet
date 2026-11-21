using Catsheet.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace Catsheet.Api.Persistence.EfCore;

/// <summary>
/// EF CORE = ORM (padanan JPA/Hibernate).
///  - DbContext  ≈ EntityManager / persistence context (unit of work + identity map)
///  - DbSet&lt;T&gt; ≈ repository/tabel
///  - SaveChanges ≈ flush + commit (otomatis dalam 1 transaksi)
/// Mapping pakai Fluent API (bukan annotation) supaya domain tetap bersih dari detail DB.
/// </summary>
public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Product>(e =>
        {
            e.ToTable("Products");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).ValueGeneratedNever(); // Id dibuat domain (UUIDv7), bukan DB
            e.Property(p => p.Name).HasMaxLength(Product.MaxNameLength).IsRequired();
            e.Ignore(p => p.Kind);

            // Value object Money → 2 kolom di tabel yang sama (JPA: @Embeddable/@Embedded).
            e.ComplexProperty(p => p.Price, money =>
            {
                money.Property(m => m.Amount).HasColumnName("PriceAmount").HasPrecision(18, 2);
                money.Property(m => m.Currency).HasColumnName("PriceCurrency").HasMaxLength(3);
            });

            // INHERITANCE MAPPING: Table-Per-Hierarchy (JPA: @Inheritance(SINGLE_TABLE)).
            // Satu tabel, kolom "Kind" sebagai discriminator. Shadow property (tidak ada di class)
            // diberi nama lain karena nama "Kind" sudah dipakai property C# yang di-Ignore.
            e.HasDiscriminator<string>("Discriminator")
                .HasValue<PhysicalProduct>("Physical")
                .HasValue<DigitalProduct>("Digital");
            e.Property<string>("Discriminator").HasColumnName("Kind").HasMaxLength(20);
        });

        model.Entity<PhysicalProduct>().Property(p => p.WeightKg).HasPrecision(10, 3);
        model.Entity<DigitalProduct>().Property(p => p.DownloadUrl).HasMaxLength(500);
    }
}
