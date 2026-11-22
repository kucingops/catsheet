<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * HTTP Basic tanpa session: tiap request wajib kirim header Authorization: Basic base64(email:password).
 * Bawaan Laravel `auth.basic` menyimpan login ke session; versi `onceBasic()` ini tidak.
 */
final class StatelessBasicAuth
{
    public function handle($request, Closure $next): Response
    {
        return Auth::guard('web')->onceBasic('email') ?? $next($request);
    }
}
