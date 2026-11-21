using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Catsheet.Api.Security;

public sealed class ApiKeyClient
{
    public required string Name { get; init; }
    public required string Key { get; init; }
    public string[] Roles { get; init; } = [];
    public string[] Permissions { get; init; } = [];
}

/// <summary>Options per scheme: dibind dari appsettings section "ApiKeys".</summary>
public sealed class ApiKeyOptions : AuthenticationSchemeOptions
{
    public const string HeaderName = "X-Api-Key";
    public List<ApiKeyClient> Clients { get; set; } = [];
}

/// <summary>
/// API key untuk machine-to-machine (CI bot, service lain). Handler custom kedua, sengaja
/// pakai Options sendiri supaya kelihatan pola <c>AuthenticationHandler&lt;TOptions&gt;</c>.
/// </summary>
public sealed class ApiKeyAuthenticationHandler(
    IOptionsMonitor<ApiKeyOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<ApiKeyOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyOptions.HeaderName, out var provided) || string.IsNullOrEmpty(provided))
            return Task.FromResult(AuthenticateResult.NoResult());

        var providedBytes = Encoding.UTF8.GetBytes(provided.ToString());
        // Constant-time compare: cegah timing attack.
        var client = Options.Clients.FirstOrDefault(c =>
            CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(c.Key), providedBytes));

        if (client is null) return Task.FromResult(AuthenticateResult.Fail("API key tidak dikenal."));

        var claims = new List<Claim> { new(ClaimTypes.Name, client.Name), new(ClaimTypes.NameIdentifier, client.Name) };
        claims.AddRange(client.Roles.Select(r => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(client.Permissions.Select(p => new Claim(Permissions.ClaimType, p)));

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name)));
    }
}
