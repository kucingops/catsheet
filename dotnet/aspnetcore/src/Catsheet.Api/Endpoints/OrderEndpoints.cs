using Catsheet.Api.Application;
using Catsheet.Api.Security;

namespace Catsheet.Api.Endpoints;

public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/orders").WithTags("Orders");

        // Quote: sengaja AllowAnonymous – override fallback policy.
        g.MapPost("/quote", (QuoteRequest req, OrderService svc, CancellationToken ct) => svc.QuoteAsync(req, ct))
            .AllowAnonymous();

        g.MapPost("/checkout", (QuoteRequest req, OrderService svc, CancellationToken ct) => svc.CheckoutAsync(req, ct))
            .RequireAuthorization(Policies.CanCheckout);

        return g;
    }
}
