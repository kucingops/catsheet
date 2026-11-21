using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Catsheet.Api.Application;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Catsheet.Api.Tests.Integration;

public class ProductApiTests(CatsheetApiFactory factory) : IClassFixture<CatsheetApiFactory>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private HttpClient AdminClient()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes("alice:alice123")));
        return client;
    }

    [Fact]
    public async Task Create_get_quote_checkout_end_to_end()
    {
        var client = AdminClient();

        var created = await client.PostAsJsonAsync("/api/products",
            new CreateProductRequest("Physical", "Kaos", 80_000, Stock: 2, WeightKg: 0.25m), Ct);
        var product = (await created.Content.ReadFromJsonAsync<ProductResponse>(Ct))!;
        Assert.Equal($"/api/products/{product.Id}", created.Headers.Location!.ToString());

        // Quote: anonymous boleh.
        var quote = await factory.CreateClient().PostAsJsonAsync("/api/orders/quote",
            new QuoteRequest([new CartItem(product.Id, 2)], "PCT10"), Ct);
        var q = (await quote.Content.ReadFromJsonAsync<QuoteResponse>(Ct))!;
        Assert.Equal(160_000m - 16_000m + 10_000m, q.Total);

        // Checkout 2x: yang kedua gagal karena stok habis → 400 ProblemDetails.
        var ok = await client.PostAsJsonAsync("/api/orders/checkout", new QuoteRequest([new CartItem(product.Id, 2)]), Ct);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var fail = await client.PostAsJsonAsync("/api/orders/checkout", new QuoteRequest([new CartItem(product.Id, 1)]), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, fail.StatusCode);
        var problem = await fail.Content.ReadFromJsonAsync<ProblemDetails>(Ct);
        Assert.Contains("Stok", problem!.Detail);
    }

    [Fact]
    public async Task Validasi_DataAnnotations_menghasilkan_400()
    {
        var res = await AdminClient().PostAsJsonAsync("/api/products",
            new { kind = "Barang", name = "", price = -1 }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var problem = await res.Content.ReadFromJsonAsync<HttpValidationProblemDetails>(Ct);
        Assert.Contains("Kind", problem!.Errors.Keys);
        Assert.Contains("Price", problem.Errors.Keys);
    }

    [Fact]
    public async Task Produk_tidak_ada_404()
    {
        var res = await AdminClient().GetAsync($"/api/products/{Guid.NewGuid()}", Ct);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
