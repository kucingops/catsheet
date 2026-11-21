using Microsoft.AspNetCore.Authorization;

namespace Catsheet.Api.Security;

/// <summary>
/// CUSTOM AUTHORIZATION: requirement (data) + handler (logika) dipisah.
/// Spring padanannya: <c>@PreAuthorize("hasAuthority('catalog:write')")</c> atau
/// custom <c>AuthorizationManager</c>.
/// </summary>
public sealed record PermissionRequirement(string Permission) : IAuthorizationRequirement;

public sealed class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        // Admin otomatis lolos semua permission (contoh aturan "super role").
        if (context.User.IsInRole(Roles.Admin)
            || context.User.HasClaim(Permissions.ClaimType, requirement.Permission))
        {
            context.Succeed(requirement);
        }
        // Tidak memanggil Fail(): biar handler lain (kalau ada) masih bisa meloloskan.
        return Task.CompletedTask;
    }
}
