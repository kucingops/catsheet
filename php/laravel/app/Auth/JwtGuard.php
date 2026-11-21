<?php

namespace App\Auth;

use Illuminate\Auth\GuardHelpers;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;

/**
 * Custom guard = implement interface `Guard`. Laravel tidak peduli caranya,
 * selama bisa jawab user() dan validate(). Didaftarkan lewat Auth::extend('jwt', ...).
 * Padanannya di Spring: custom AuthenticationFilter + AuthenticationProvider.
 */
final class JwtGuard implements Guard
{
    use GuardHelpers; // check(), guest(), id(), setUser() ... gratis dari trait

    public function __construct(
        UserProvider $provider,
        private readonly JwtService $jwt,
        private Request $request,
    ) {
        $this->provider = $provider;
    }

    public function user(): ?Authenticatable
    {
        if ($this->user !== null) {
            return $this->user;
        }

        $token = $this->request->bearerToken();
        $id = $token ? $this->jwt->subject($token) : null;

        return $this->user = $id ? $this->provider->retrieveById($id) : null;
    }

    public function validate(array $credentials = []): bool
    {
        $user = $this->provider->retrieveByCredentials($credentials);

        return $user !== null && $this->provider->validateCredentials($user, $credentials);
    }

    /** Guard di-resolve sekali per request; untuk Octane/test, pastikan request-nya ikut diganti. */
    public function setRequest(Request $request): self
    {
        $this->request = $request;
        $this->user = null;

        return $this;
    }
}
