using Catsheet.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace Catsheet.Api.Errors;

/// <summary>
/// Global exception → HTTP response (RFC 9457 ProblemDetails).
/// Spring padanannya: @RestControllerAdvice + @ExceptionHandler.
/// </summary>
public sealed class DomainExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        (int status, string title) = ex switch
        {
            DomainException => (StatusCodes.Status400BadRequest, "Aturan bisnis dilanggar"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Input tidak valid"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Data tidak ditemukan"),
            _ => (0, ""),
        };
        if (status == 0) return false; // biarkan handler default (500)

        ctx.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails = { Status = status, Title = title, Detail = ex.Message },
        });
    }
}
