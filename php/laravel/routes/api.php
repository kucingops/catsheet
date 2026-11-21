<?php

use App\Http\Controllers\Auth\JwtTokenController;
use App\Http\Controllers\Auth\SanctumTokenController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\WhoAmIController;
use App\Http\Middleware\StatelessBasicAuth;
use App\Models\Note;
use Illuminate\Support\Facades\Route;

/*
 * Semua route di sini otomatis berawalan /api dan pakai middleware group "api" (stateless, tanpa CSRF).
 */

// --- 3. Sanctum personal access token ---
Route::post('/sanctum/token', [SanctumTokenController::class, 'store']);
Route::delete('/sanctum/token', [SanctumTokenController::class, 'destroy'])->middleware('auth:sanctum');
Route::get('/sanctum/me', WhoAmIController::class)->middleware('auth:sanctum');

// --- 4. HTTP Basic (stateless) ---
Route::get('/basic/me', WhoAmIController::class)->middleware(StatelessBasicAuth::class);

// --- 5. JWT (custom guard) ---
Route::post('/jwt/token', [JwtTokenController::class, 'store']);
Route::get('/jwt/me', WhoAmIController::class)->middleware('auth:jwt');

// --- 6. API key partner (machine to machine) ---
Route::get('/partner/me', WhoAmIController::class)->middleware('auth:partner');

// Multi guard dalam satu route: coba sanctum dulu, kalau gagal coba jwt.
Route::get('/me', WhoAmIController::class)->middleware('auth:sanctum,jwt');

// --- Authorization: ability token + policy + gate ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notes', [NoteController::class, 'index'])->middleware('abilities:notes:read');
    Route::get('/notes/{note}', [NoteController::class, 'show'])->middleware('abilities:notes:read');
    Route::post('/notes', [NoteController::class, 'store'])->middleware('abilities:notes:write');
    Route::put('/notes/{note}', [NoteController::class, 'update'])->middleware('abilities:notes:write');
    Route::delete('/notes/{note}', [NoteController::class, 'destroy'])->middleware('abilities:notes:write');

    Route::get('/reports', fn () => ['total_notes' => Note::count()])->middleware('can:view-reports');
});
