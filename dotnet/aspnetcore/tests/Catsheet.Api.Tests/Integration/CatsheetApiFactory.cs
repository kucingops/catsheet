using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Catsheet.Api.Tests.Integration;

/// <summary>
/// Jalankan app UTUH di memori (tanpa port/network) – padanan @SpringBootTest + MockMvc.
/// Override config: pakai repository in-memory supaya tiap factory punya data bersih.
/// </summary>
public sealed class CatsheetApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Persistence:Provider", "InMemory");
        // Bisa juga: builder.ConfigureTestServices(s => s.Replace(...)) untuk ganti bean/service.
    }
}
