using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Catsheet.Api.Security;

public sealed class JwtOptions
{
    public const string Section = "Jwt";
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    /// <summary>HMAC key, minimal 32 byte. Di production ambil dari secret store, bukan appsettings.</summary>
    public required string SigningKey { get; init; }
    public int LifetimeMinutes { get; init; } = 30;

    public SymmetricSecurityKey Key() => new(Encoding.UTF8.GetBytes(SigningKey));
}

public sealed record TokenResponse(string AccessToken, string TokenType, int ExpiresIn);

/// <summary>Bikin JWT (stateless). Validasinya dikerjakan middleware JwtBearer.</summary>
public sealed class JwtTokenService(JwtOptions options, TimeProvider clock)
{
    public TokenResponse Issue(AppUser user)
    {
        var now = clock.GetUtcNow();
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            Subject = new(ClaimsFactory.For(user)),
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = now.AddMinutes(options.LifetimeMinutes).UtcDateTime,
            SigningCredentials = new SigningCredentials(options.Key(), SecurityAlgorithms.HmacSha256),
        };
        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return new TokenResponse(token, "Bearer", options.LifetimeMinutes * 60);
    }
}
