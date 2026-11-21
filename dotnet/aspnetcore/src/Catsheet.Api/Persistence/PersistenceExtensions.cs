using Catsheet.Api.Persistence.Ado;
using Catsheet.Api.Persistence.EfCore;
using Catsheet.Api.Persistence.InMemory;
using Catsheet.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace Catsheet.Api.Persistence;

public enum PersistenceProvider { InMemory, EfCore, Ado }

public sealed class PersistenceOptions
{
    public const string Section = "Persistence";
    public PersistenceProvider Provider { get; set; } = PersistenceProvider.InMemory;
    public string ConnectionString { get; set; } = "Data Source=catsheet.db";
}

/// <summary>
/// Pilih implementasi repository dari konfigurasi. Kode di atasnya (service, endpoint)
/// tidak berubah sama sekali: itu gunanya programming to an interface.
/// Spring padanannya: @Profile / @ConditionalOnProperty di beberapa @Repository.
/// </summary>
public static class PersistenceExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection AddCatsheetPersistence(IConfiguration config)
        {
            var opts = config.GetSection(PersistenceOptions.Section).Get<PersistenceOptions>() ?? new();
            services.AddSingleton(opts);

            switch (opts.Provider)
            {
                case PersistenceProvider.InMemory:
                    services.AddSingleton<IProductRepository, InMemoryProductRepository>();
                    break;
                case PersistenceProvider.EfCore:
                    services.AddDbContext<CatalogDbContext>(o => o.UseSqlite(opts.ConnectionString)); // Scoped
                    services.AddScoped<IProductRepository, EfProductRepository>();
                    break;
                case PersistenceProvider.Ado:
                    // Stateless (cuma pegang connection string) → aman jadi Singleton.
                    services.AddSingleton(new AdoProductRepository(opts.ConnectionString));
                    services.AddSingleton<IProductRepository>(sp => sp.GetRequiredService<AdoProductRepository>());
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(opts.Provider), opts.Provider, null);
            }
            return services;
        }
    }

    extension(WebApplication app)
    {
        /// <summary>Bikin schema saat startup. Untuk production pakai EF migrations / Flyway-like tool.</summary>
        public async Task InitializeDatabaseAsync()
        {
            var opts = app.Services.GetRequiredService<PersistenceOptions>();
            switch (opts.Provider)
            {
                case PersistenceProvider.EfCore:
                    await using (var scope = app.Services.CreateAsyncScope())
                    {
                        var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
                        await db.Database.EnsureCreatedAsync();
                    }
                    break;
                case PersistenceProvider.Ado:
                    await app.Services.GetRequiredService<AdoProductRepository>().EnsureSchemaAsync();
                    break;
            }
        }
    }
}
