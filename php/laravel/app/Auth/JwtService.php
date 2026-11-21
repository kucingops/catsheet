<?php

namespace App\Auth;

use DomainException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Contracts\Auth\Authenticatable;
use InvalidArgumentException;
use Psr\Clock\ClockInterface;
use UnexpectedValueException;

/**
 * JWT stateless: server tidak menyimpan apa-apa, semua info ada di token yang ditandatangani (HS256).
 * Trade-off vs Sanctum (token opaque di tabel): JWT tidak bisa di-revoke sebelum exp
 * kecuali bikin denylist -> ujung-ujungnya butuh storage juga.
 */
final readonly class JwtService
{
    public function __construct(
        private string $secret,
        private string $issuer,
        private int $ttlSeconds,
        private ClockInterface $clock,
    ) {}

    public function issue(Authenticatable $user): string
    {
        $now = $this->clock->now()->getTimestamp();

        return JWT::encode([
            'iss' => $this->issuer,
            'sub' => (string) $user->getAuthIdentifier(),
            'iat' => $now,
            'exp' => $now + $this->ttlSeconds,
        ], $this->secret, 'HS256');
    }

    /** @return string|null id user (claim `sub`) kalau token valid */
    public function subject(string $token): ?string
    {
        try {
            JWT::$timestamp = $this->clock->now()->getTimestamp();
            $claims = JWT::decode($token, new Key($this->secret, 'HS256'));
        } catch (UnexpectedValueException|DomainException|InvalidArgumentException) {
            // signature salah, expired, header/payload bukan JSON, dll. Token jelek = tamu, bukan error 500.
            return null;
        } finally {
            JWT::$timestamp = null;
        }

        return ($claims->iss ?? null) === $this->issuer ? ($claims->sub ?? null) : null;
    }
}
