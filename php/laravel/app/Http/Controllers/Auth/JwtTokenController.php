<?php

namespace App\Http\Controllers\Auth;

use App\Auth\JwtService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class JwtTokenController extends Controller
{
    /** Method injection: JwtService di-resolve container otomatis. */
    public function store(Request $request, JwtService $jwt): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $provider = Auth::createUserProvider('users');
        $user = $provider->retrieveByCredentials($credentials);
        if (! $user || ! $provider->validateCredentials($user, $credentials)) {
            throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
        }

        return response()->json([
            'access_token' => $jwt->issue($user),
            'token_type' => 'Bearer',
            'expires_in' => config('catsheet.jwt.ttl'),
        ]);
    }
}
