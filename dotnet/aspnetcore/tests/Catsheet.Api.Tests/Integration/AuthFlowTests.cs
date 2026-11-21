using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Catsheet.Api.Application;
using Catsheet.Api.Controllers;
using Catsheet.Api.Security;

namespace Catsheet.Api.Tests.Integration;

/// <summary>
/// INTEGRATION TEST: request HTTP beneran ke pipeline (middleware, auth, routing, JSON).
/// IClassFixture = 1 app dipakai bareng oleh semua test di class ini (mahal kalau bikin ulang).
/// </summary>
public class AuthFlowTests(CatsheetApiFactory factory) : IClassFixture<CatsheetApiFactory>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static AuthenticationHeaderValue Basic(string user, string pass) =>
        new("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user}:{pass}")));

    private async Task<string> JwtFor(HttpClient client, string user, string pass)
    {
        var res = await client.PostAsJsonAsync("/auth/token", new { username = user, password = pass }, Ct);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<TokenResponse>(Ct))!.AccessToken;
    }

    [Fact]
    public async Task Health_publik()
    {
        var res = await factory.CreateClient().GetAsync("/health", Ct);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Tanpa_login_dapat_401()
    {
        var res = await factory.CreateClient().GetAsync("/api/products", Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Theory]
    [InlineData("alice", "salah")]
    [InlineData("tidak-ada", "x")]
    public async Task Basic_password_salah_401_dengan_WWW_Authenticate(string user, string pass)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = Basic(user, pass);

        var res = await client.GetAsync("/api/me", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Basic_berhasil()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = Basic("bob", "bob123");

        var me = await client.GetFromJsonAsync<MeResponse>("/api/me", Ct);

        Assert.Equal("bob", me!.Name);
        Assert.Equal(AuthSchemes.Basic, me.AuthenticationType);
    }

    [Fact]
    public async Task Jwt_berhasil_dan_membawa_role()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", await JwtFor(client, "alice", "alice123"));

        var me = await client.GetFromJsonAsync<MeResponse>("/api/me/jwt-admin", Ct);

        Assert.Equal("alice", me!.Name);
        Assert.Equal(AuthSchemes.Jwt, me.AuthenticationType);
        Assert.Contains(Roles.Admin, me.Roles);
    }

    [Fact]
    public async Task Jwt_bukan_admin_dapat_403()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", await JwtFor(client, "bob", "bob123"));

        var res = await client.GetAsync("/api/me/jwt-admin", Ct);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Jwt_ditolak_di_endpoint_khusus_Basic()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", await JwtFor(client, "alice", "alice123"));

        var res = await client.GetAsync("/api/me/basic-only", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Jwt_dirusak_ditolak()
    {
        var client = factory.CreateClient();
        var token = await JwtFor(client, "alice", "alice123");
        client.DefaultRequestHeaders.Authorization = new("Bearer", token[..^4] + "AAAA"); // signature diubah

        var res = await client.GetAsync("/api/me", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task ApiKey_berhasil_dan_permission_dari_config()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(ApiKeyOptions.HeaderName, "dev-api-key-123");

        var me = await client.GetFromJsonAsync<MeResponse>("/api/me", Ct);

        Assert.Equal("ci-bot", me!.Name);
        Assert.Contains(Permissions.CatalogWrite, me.Permissions);
    }

    [Fact]
    public async Task Cookie_login_lalu_akses_lalu_logout()
    {
        // HttpClient dari factory otomatis menyimpan cookie (seperti browser).
        var client = factory.CreateClient();

        var login = await client.PostAsJsonAsync("/auth/cookie/login", new { username = "bob", password = "bob123" }, Ct);
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);

        var me = await client.GetFromJsonAsync<MeResponse>("/api/me", Ct);
        Assert.Equal(AuthSchemes.Cookie, me!.AuthenticationType);

        await client.PostAsync("/auth/cookie/logout", null, Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me", Ct)).StatusCode);
    }

    public static TheoryData<string, HttpStatusCode> CreateProductCases => new()
    {
        { "alice", HttpStatusCode.Created },   // Admin
        { "bob", HttpStatusCode.Forbidden },   // User tanpa catalog:write
    };

    [Theory]
    [MemberData(nameof(CreateProductCases))]
    public async Task Policy_permission_menentukan_boleh_tulis_catalog(string user, HttpStatusCode expected)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = Basic(user, user + "123");

        var res = await client.PostAsJsonAsync("/api/products",
            new CreateProductRequest("Digital", "Kursus .NET", 150_000, DownloadUrl: "https://example.com/c"), Ct);

        Assert.Equal(expected, res.StatusCode);
    }

    [Fact]
    public async Task ApiKey_tanpa_role_admin_tetap_bisa_tulis_karena_permission()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(ApiKeyOptions.HeaderName, "dev-api-key-123");

        var res = await client.PostAsJsonAsync("/api/products",
            new CreateProductRequest("Physical", "Mug", 45_000, Stock: 3, WeightKg: 0.3m), Ct);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }
}
