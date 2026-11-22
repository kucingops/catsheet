using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Catsheet.Api.Security;

/// <summary>
/// CUSTOM AUTHENTICATION HANDLER untuk HTTP Basic. ASP.NET Core tidak menyediakan Basic
/// bawaan, jadi kita turunkan <see cref="AuthenticationHandler{TOptions}"/> (template method:
/// framework yang atur alurnya, kita isi <see cref="HandleAuthenticateAsync"/>).
/// Spring padanannya: <c>httpBasic()</c> + <c>BasicAuthenticationFilter</c>.
/// </summary>
public sealed class BasicAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IUserStore users)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!AuthenticationHeaderValue.TryParse(Request.Headers.Authorization, out var header)
            || !"Basic".Equals(header.Scheme, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult()); // bukan urusan handler ini
        }

        string decoded;
        try
        {
            decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header.Parameter ?? ""));
        }
        catch (FormatException)
        {
            return Task.FromResult(AuthenticateResult.Fail("Header Basic tidak valid."));
        }

        var sep = decoded.IndexOf(':');
        if (sep < 0) return Task.FromResult(AuthenticateResult.Fail("Format harus user:password."));

        var user = users.ValidateCredentials(decoded[..sep], decoded[(sep + 1)..]);
        if (user is null) return Task.FromResult(AuthenticateResult.Fail("Username/password salah."));

        var ticket = new AuthenticationTicket(ClaimsFactory.Principal(user, Scheme.Name), Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.Headers.WWWAuthenticate = "Basic realm=\"catsheet\", charset=\"UTF-8\"";
        return base.HandleChallengeAsync(properties); // 401
    }
}
