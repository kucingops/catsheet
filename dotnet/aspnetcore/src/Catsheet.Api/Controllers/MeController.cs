using Catsheet.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Catsheet.Api.Controllers;

public sealed record MeResponse(string? Name, string? AuthenticationType, string[] Roles, string[] Permissions);

/// <summary>
/// CONTROLLER style (mirip @RestController di Spring). Dua endpoint di sini sengaja
/// "mengunci" scheme tertentu lewat <c>[Authorize(AuthenticationSchemes = ...)]</c>.
/// </summary>
[ApiController]
[Route("api/me")]
[Authorize] // pakai default scheme (Smart)
public sealed class MeController : ControllerBase
{
    [HttpGet]
    public ActionResult<MeResponse> Get() => Describe();

    /// <summary>Hanya terima HTTP Basic. Token JWT valid pun akan ditolak di sini.</summary>
    [HttpGet("basic-only")]
    [Authorize(AuthenticationSchemes = AuthSchemes.Basic)]
    public ActionResult<MeResponse> BasicOnly() => Describe();

    /// <summary>Hanya JWT, dan wajib role Admin.</summary>
    [HttpGet("jwt-admin")]
    [Authorize(AuthenticationSchemes = AuthSchemes.Jwt, Roles = Roles.Admin)]
    public ActionResult<MeResponse> JwtAdmin() => Describe();

    private MeResponse Describe() => new(
        User.Identity?.Name,
        User.Identity?.AuthenticationType,
        User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToArray(),
        User.FindAll(Permissions.ClaimType).Select(c => c.Value).ToArray());
}
