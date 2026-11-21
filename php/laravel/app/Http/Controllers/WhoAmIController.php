<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Invokable controller: satu action, satu class. Dipakai semua jenis login buat lihat "saya siapa". */
class WhoAmIController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user(); // user dari guard yang berhasil di middleware auth:...

        return response()->json([
            'guard' => $this->resolvedGuard(),
            'id' => $user->getAuthIdentifier(),
            'name' => $user->name,
        ]);
    }

    /** Middleware `auth:a,b` mencoba guard satu per satu, lalu set guard yang lolos jadi default. */
    private function resolvedGuard(): string
    {
        return Auth::getDefaultDriver();
    }
}
