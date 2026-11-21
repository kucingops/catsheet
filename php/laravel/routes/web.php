<?php

use App\Http\Controllers\Auth\SessionLoginController;
use App\Http\Controllers\WhoAmIController;
use Illuminate\Support\Facades\Route;

/*
 * Route di file ini pakai middleware group "web": session, cookie terenkripsi, CSRF.
 * Untuk demo semua response JSON; di app beneran biasanya Blade/Inertia.
 */

Route::get('/', fn () => ['app' => 'catsheet-laravel', 'docs' => 'lihat README.md']);

// --- 1. Login user biasa (guard web) ---
Route::get('/login', fn () => ['message' => 'POST email & password ke /login'])->name('login');
Route::post('/login', [SessionLoginController::class, 'store'])->middleware('throttle:5,1');
Route::post('/logout', [SessionLoginController::class, 'destroy'])->middleware('auth:web');
Route::get('/dashboard', WhoAmIController::class)->middleware('auth:web');

// --- 2. Login admin (guard admin, tabel & session terpisah). ->defaults() kasih tahu controller guard mana yang dipakai ---
Route::prefix('admin')->group(function () {
    Route::get('/login', fn () => ['message' => 'POST email & password ke /admin/login'])->name('admin.login');
    Route::post('/login', [SessionLoginController::class, 'store'])->defaults('guard', 'admin')->middleware('throttle:5,1');
    Route::post('/logout', [SessionLoginController::class, 'destroy'])->defaults('guard', 'admin')->middleware('auth:admin');
    Route::get('/dashboard', WhoAmIController::class)->middleware('auth:admin');
});
