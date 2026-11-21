<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Sanctum personal access token: token random, yang disimpan di DB cuma hash-nya.
 * Bisa di-revoke kapan saja (hapus baris) dan punya "abilities" (mirip OAuth scope).
 */
class SanctumTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device' => ['required', 'string', 'max:100'],
            'abilities' => ['array'],
            'abilities.*' => ['in:notes:read,notes:write'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
        }

        $token = $user->createToken($data['device'], $data['abilities'] ?? ['notes:read']);

        return response()->json(['token' => $token->plainTextToken], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(status: 204);
    }
}
