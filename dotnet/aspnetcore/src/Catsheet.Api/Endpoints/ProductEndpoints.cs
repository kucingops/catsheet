using Catsheet.Api.Application;
using Catsheet.Api.Security;

namespace Catsheet.Api.Endpoints;

/// <summary>
/// MINIMAL API: endpoint sebagai lambda. Dependency di-inject langsung ke parameter.
/// Gaya lain (Controller + attribute, mirip @RestController) ada di <c>Controllers/MeController</c>.
/// </summary>
public static class ProductEndpoints
{
    public static RouteGroupBuilder MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        // RequireAuthorization() tanpa argumen: cukup login, scheme apa saja (lewat "Smart").
        var g = app.MapGroup("/api/products").RequireAuthorization().WithTags("Products");

        g.MapGet("/", (CatalogService svc, CancellationToken ct) => svc.ListAsync(ct));

        g.MapGet("/{id:guid}", async (Guid id, CatalogService svc, CancellationToken ct) =>
            await svc.GetAsync(id, ct) is { } p ? Results.Ok(p) : Results.NotFound());

        g.MapPost("/", async (CreateProductRequest req, CatalogService svc, CancellationToken ct) =>
            {
                var created = await svc.CreateAsync(req, ct);
                return Results.Created($"/api/products/{created.Id}", created);
            })
            .RequireAuthorization(Policies.CanWriteCatalog);

        g.MapPost("/{id:guid}/restock", (Guid id, RestockRequest req, CatalogService svc, CancellationToken ct) =>
                svc.RestockAsync(id, req.Quantity, ct))
            .RequireAuthorization(Policies.CanWriteCatalog);

        g.MapDelete("/{id:guid}", async (Guid id, CatalogService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? Results.NoContent() : Results.NotFound())
            .RequireAuthorization(Policies.AdminOnly);

        return g;
    }
}
