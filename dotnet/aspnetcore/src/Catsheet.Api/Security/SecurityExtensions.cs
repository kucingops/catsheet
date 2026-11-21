using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace Catsheet.Api.Security;

/// <summary>
/// Semua konfigurasi security di satu tempat (mirip class <c>SecurityConfig</c> di Spring).
/// Pakai C# 14 extension block supaya Program.cs tinggal <c>builder.Services.AddCatsheetSecurity(config)</c>.
/// </summary>
public static class SecurityExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection AddCatsheetSecurity(IConfiguration config)
        {
            var jwt = config.GetSection(JwtOptions.Section).Get<JwtOptions>()
                      ?? throw new InvalidOperationException("Section 'Jwt' belum dikonfigurasi.");

            services.AddSingleton(jwt);
            services.AddSingleton<JwtTokenService>();
            services.AddSingleton<IUserStore, InMemoryUserStore>();
            services.AddSingleton<IAuthorizationHandler, PermissionHandler>();

            services
                .AddAuthentication(o =>
                {
                    // Default: biarkan "Smart" yang memilih scheme berdasar request.
                    o.DefaultScheme = AuthSchemes.Smart;
                    o.DefaultChallengeScheme = AuthSchemes.Smart;
                })
                // 1) Cookie: login sekali, browser simpan cookie (stateful, cocok untuk web app/BFF).
                .AddCookie(AuthSchemes.Cookie, o =>
                {
                    o.Cookie.Name = "catsheet.auth";
                    o.Cookie.HttpOnly = true;
                    o.Cookie.SameSite = SameSiteMode.Strict;
                    o.SlidingExpiration = true;
                    o.ExpireTimeSpan = TimeSpan.FromHours(1);
                    // Untuk API: jangan redirect ke /Account/Login, cukup 401/403.
                    o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
                    o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
                })
                // 2) HTTP Basic: custom handler.
                .AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>(AuthSchemes.Basic, null)
                // 3) JWT Bearer: stateless, cocok untuk SPA / mobile / service-to-service.
                .AddJwtBearer(AuthSchemes.Jwt, o =>
                {
                    o.MapInboundClaims = false; // biar nama claim apa adanya, tidak di-rename ke URI panjang
                    o.TokenValidationParameters = new TokenValidationParameters
                    {
                        AuthenticationType = AuthSchemes.Jwt, // default-nya "AuthenticationTypes.Federation"
                        ValidIssuer = jwt.Issuer,
                        ValidAudience = jwt.Audience,
                        IssuerSigningKey = jwt.Key(),
                        ValidateIssuerSigningKey = true,
                        ClockSkew = TimeSpan.FromSeconds(30),
                        NameClaimType = System.Security.Claims.ClaimTypes.Name,
                        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                    };
                })
                // 4) API key: custom handler dengan options sendiri.
                .AddScheme<ApiKeyOptions, ApiKeyAuthenticationHandler>(AuthSchemes.ApiKey,
                    o => o.Clients = config.GetSection("ApiKeys").Get<List<ApiKeyClient>>() ?? [])
                // 5) Policy scheme: lihat header, teruskan (forward) ke scheme yang cocok.
                .AddPolicyScheme(AuthSchemes.Smart, "Pilih otomatis", o =>
                {
                    o.ForwardDefaultSelector = ctx =>
                    {
                        string auth = ctx.Request.Headers.Authorization.ToString();
                        if (auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return AuthSchemes.Jwt;
                        if (auth.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase)) return AuthSchemes.Basic;
                        if (ctx.Request.Headers.ContainsKey(ApiKeyOptions.HeaderName)) return AuthSchemes.ApiKey;
                        return AuthSchemes.Cookie;
                    };
                });

            services.AddAuthorizationBuilder()
                // Fallback policy: endpoint TANPA atribut apa pun tetap wajib login (secure by default).
                .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
                .AddPolicy(Policies.AdminOnly, p => p.RequireRole(Roles.Admin))
                .AddPolicy(Policies.CanWriteCatalog, p => p.AddRequirements(new PermissionRequirement(Permissions.CatalogWrite)))
                .AddPolicy(Policies.CanCheckout, p => p.AddRequirements(new PermissionRequirement(Permissions.OrderCheckout)));

            return services;
        }
    }
}
