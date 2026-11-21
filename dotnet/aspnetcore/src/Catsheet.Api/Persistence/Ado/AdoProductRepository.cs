using System.Data.Common;
using System.Globalization;
using Catsheet.Domain.Catalog;
using Catsheet.Domain.Pricing;
using Microsoft.Data.Sqlite;

namespace Catsheet.Api.Persistence.Ado;

/// <summary>
/// TANPA ORM: ADO.NET mentah (padanan JDBC / JdbcTemplate).
/// Semua manual: buka koneksi, tulis SQL, bind parameter, mapping row → object.
/// Kelebihan: kontrol penuh &amp; cepat. Kekurangan: boilerplate, mapping inheritance manual.
/// Versi "tengah-tengah" yang populer: Dapper (micro-ORM, mirip JdbcTemplate + RowMapper otomatis).
/// </summary>
public sealed class AdoProductRepository(string connectionString) : IProductRepository
{
    private const string Columns = "Id, Kind, Name, PriceAmount, PriceCurrency, Stock, WeightKg, DownloadUrl";

    public const string Schema = """
        CREATE TABLE IF NOT EXISTS Products (
            Id            TEXT    NOT NULL PRIMARY KEY,
            Kind          TEXT    NOT NULL,
            Name          TEXT    NOT NULL,
            PriceAmount   TEXT    NOT NULL,
            PriceCurrency TEXT    NOT NULL,
            Stock         INTEGER NOT NULL,
            WeightKg      TEXT    NULL,
            DownloadUrl   TEXT    NULL
        );
        """;

    private async Task<SqliteConnection> OpenAsync(CancellationToken ct)
    {
        var conn = new SqliteConnection(connectionString); // connection pooling diurus driver
        await conn.OpenAsync(ct);
        return conn;
    }

    public async Task EnsureSchemaAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = Schema;
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<Product?> FindByIdAsync(Guid id, CancellationToken ct = default)
    {
        // `await using` = try-with-resources di Java (Dispose otomatis, async).
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Columns} FROM Products WHERE Id = $id";
        cmd.Parameters.AddWithValue("$id", id.ToString()); // SELALU parameter, jangan string concat (SQL injection)

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? Map(reader) : null;
    }

    public async Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Columns} FROM Products ORDER BY Name";

        var result = new List<Product>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct)) result.Add(Map(reader));
        return result;
    }

    public async Task AddAsync(Product product, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        // Transaksi eksplisit (di EF Core ini otomatis per SaveChanges).
        await using var tx = await conn.BeginTransactionAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = (SqliteTransaction)tx;
        cmd.CommandText = $"""
            INSERT INTO Products ({Columns})
            VALUES ($id, $kind, $name, $amount, $currency, $stock, $weight, $url)
            """;
        Bind(cmd, product);
        await cmd.ExecuteNonQueryAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task UpdateAsync(Product product, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE Products
               SET Name = $name, PriceAmount = $amount, PriceCurrency = $currency,
                   Stock = $stock, WeightKg = $weight, DownloadUrl = $url, Kind = $kind
             WHERE Id = $id
            """;
        Bind(cmd, product);
        if (await cmd.ExecuteNonQueryAsync(ct) == 0)
            throw new KeyNotFoundException($"Product {product.Id} tidak ditemukan.");
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM Products WHERE Id = $id";
        cmd.Parameters.AddWithValue("$id", id.ToString());
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    private static void Bind(SqliteCommand cmd, Product p)
    {
        cmd.Parameters.AddWithValue("$id", p.Id.ToString());
        cmd.Parameters.AddWithValue("$kind", p.Kind);
        cmd.Parameters.AddWithValue("$name", p.Name);
        cmd.Parameters.AddWithValue("$amount", p.Price.Amount.ToString(CultureInfo.InvariantCulture));
        cmd.Parameters.AddWithValue("$currency", p.Price.Currency);
        cmd.Parameters.AddWithValue("$stock", p.Stock);

        // Pattern matching per subtype: mapping inheritance yang di EF dikerjakan otomatis.
        (object weight, object url) = p switch
        {
            PhysicalProduct pp => ((object)pp.WeightKg.ToString(CultureInfo.InvariantCulture), (object)DBNull.Value),
            DigitalProduct dp => (DBNull.Value, dp.DownloadUrl),
            _ => throw new NotSupportedException(p.GetType().Name),
        };
        cmd.Parameters.AddWithValue("$weight", weight);
        cmd.Parameters.AddWithValue("$url", url);
    }

    /// <summary>Row mapper manual (JDBC: RowMapper&lt;T&gt;).</summary>
    private static Product Map(DbDataReader r)
    {
        var id = Guid.Parse(r.GetString(0));
        var name = r.GetString(2);
        var price = new Money(decimal.Parse(r.GetString(3), CultureInfo.InvariantCulture), r.GetString(4));

        return r.GetString(1) switch
        {
            "Physical" => new PhysicalProduct(id, name, price, r.GetInt32(5),
                decimal.Parse(r.GetString(6), CultureInfo.InvariantCulture)),
            "Digital" => new DigitalProduct(id, name, price, r.GetString(7)),
            var kind => throw new InvalidOperationException($"Kind tidak dikenal: {kind}"),
        };
    }
}
