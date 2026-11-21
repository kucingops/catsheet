using Catsheet.Api.Application;
using Catsheet.Api.Endpoints;
using Catsheet.Api.Errors;
using Catsheet.Api.Persistence;
using Catsheet.Api.Security;

// Top-level statements: tidak perlu class Program + static void Main.
var builder = WebApplication.CreateBuilder(args);

// ---------- Dependency Injection (IoC container bawaan) ----------
// Lifetime: Singleton (1 untuk app), Scoped (1 per request), Transient (baru tiap inject).
// Spring: singleton bean, @RequestScope, prototype.
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddSingleton<IDiscountResolver, DiscountResolver>();

builder.Services.AddCatsheetPersistence(builder.Configuration);
builder.Services.AddCatsheetSecurity(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddValidation();            // validasi DataAnnotations untuk minimal API (.NET 10+)
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddOpenApi();

var app = builder.Build();

await app.InitializeDatabaseAsync();

// ---------- Middleware pipeline (urutan penting!) ----------
// Spring padanannya: urutan Filter di SecurityFilterChain.
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();   // siapa kamu?
app.UseAuthorization();    // boleh apa?

if (app.Environment.IsDevelopment())
    app.MapOpenApi().AllowAnonymous(); // /openapi/v1.json

app.MapGet("/health", () => Results.Ok(new { status = "UP" })).AllowAnonymous();
app.MapAuthEndpoints();
app.MapProductEndpoints();
app.MapOrderEndpoints();
app.MapControllers();

app.Run();

// Supaya WebApplicationFactory<Program> di integration test bisa merujuk class ini.
public partial class Program;
