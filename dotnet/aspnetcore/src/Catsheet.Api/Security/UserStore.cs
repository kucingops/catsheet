using System.Security.Claims;
using Microsoft.AspNetCore.Identity;

namespace Catsheet.Api.Security;

public sealed record AppUser(string Username, string PasswordHash, string[] Roles, string[] Permissions);

public interface IUserStore
{
    AppUser? ValidateCredentials(string username, string password);
}

/// <summary>
/// User store in-memory untuk demo. Password tetap di-hash pakai <see cref="PasswordHasher{TUser}"/>
/// (PBKDF2, bawaan ASP.NET Core Identity) – jangan pernah simpan plain text.
/// Di Spring padanannya: UserDetailsService + PasswordEncoder.
/// </summary>
public sealed class InMemoryUserStore : IUserStore
{
    private readonly PasswordHasher<AppUser> _hasher = new();
    private readonly Dictionary<string, AppUser> _users = new(StringComparer.OrdinalIgnoreCase);

    public InMemoryUserStore()
    {
        Add("alice", "alice123", [Roles.Admin, Roles.User], [Permissions.CatalogWrite, Permissions.OrderCheckout]);
        Add("bob", "bob123", [Roles.User], [Permissions.OrderCheckout]);
    }

    private void Add(string username, string password, string[] roles, string[] permissions)
    {
        var placeholder = new AppUser(username, "", roles, permissions);
        _users[username] = placeholder with { PasswordHash = _hasher.HashPassword(placeholder, password) };
    }

    public AppUser? ValidateCredentials(string username, string password)
    {
        if (!_users.TryGetValue(username, out var user)) return null;
        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result == PasswordVerificationResult.Failed ? null : user;
    }
}

public static class ClaimsFactory
{
    /// <summary>User → daftar claim. Dipakai SEMUA scheme supaya bentuk principal-nya seragam.</summary>
    public static List<Claim> For(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Username),
            new(ClaimTypes.Name, user.Username),
        };
        claims.AddRange(user.Roles.Select(r => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(user.Permissions.Select(p => new Claim(Permissions.ClaimType, p)));
        return claims;
    }

    public static ClaimsPrincipal Principal(AppUser user, string scheme) =>
        new(new ClaimsIdentity(For(user), scheme));
}
