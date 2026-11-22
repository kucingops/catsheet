<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Satu controller dipakai dua guard (web & admin): nama guard diambil dari route default.
 * Lihat routes/web.php -> ->defaults('guard', 'admin').
 */
class SessionLoginController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $guard = $this->guard($request);
        if (! Auth::guard($guard)->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
        }

        $request->session()->regenerate(); // cegah session fixation

        return response()->json(['guard' => $guard, 'user' => Auth::guard($guard)->user()]);
    }

    public function destroy(Request $request): JsonResponse
    {
        Auth::guard($this->guard($request))->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken(); // CSRF token baru

        return response()->json(['message' => 'Logged out']);
    }

    private function guard(Request $request): string
    {
        return $request->route('guard', 'web');
    }
}
