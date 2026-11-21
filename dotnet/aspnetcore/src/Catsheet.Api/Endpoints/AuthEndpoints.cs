using Catsheet.Api.Security;
using Microsoft.AspNetCore.Authentication;

namespace Catsheet.Api.Endpoints;

public sealed record LoginRequest(string Username, string Password);

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/auth").AllowAnonymous().WithTags("Auth");

        // JWT: tukar username/password dengan access token.
        g.MapPost("/token", (LoginRequest req, IUserStore users, JwtTokenService tokens) =>
            users.ValidateCredentials(req.Username, req.Password) is { } user
                ? Results.Ok(tokens.Issue(user))
                : Results.Unauthorized());

        // Cookie: login → server set cookie terenkripsi (Data Protection API).
        // Catatan: untuk form HTML beneran, aktifkan antiforgery token (CSRF).
        g.MapPost("/cookie/login", async (LoginRequest req, IUserStore users, HttpContext http) =>
        {
            if (users.ValidateCredentials(req.Username, req.Password) is not { } user)
                return Results.Unauthorized();

            await http.SignInAsync(AuthSchemes.Cookie, ClaimsFactory.Principal(user, AuthSchemes.Cookie));
            return Results.NoContent();
        });

        g.MapPost("/cookie/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync(AuthSchemes.Cookie);
            return Results.NoContent();
        });

        return g;
    }
}
