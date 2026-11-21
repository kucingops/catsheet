<?php

namespace Tests\Unit;

use App\Auth\JwtService;
use DateTimeImmutable;
use Illuminate\Auth\GenericUser;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Psr\Clock\ClockInterface;

final class JwtServiceTest extends TestCase
{
    /** Clock yang bisa diatur: waktu jadi dependency, bukan global -> test deterministik. */
    private ClockInterface $clock;

    protected function setUp(): void
    {
        $this->clock = new class implements ClockInterface
        {
            public DateTimeImmutable $now;

            public function now(): DateTimeImmutable
            {
                return $this->now;
            }
        };
        $this->clock->now = new DateTimeImmutable('2026-01-01 00:00:00');
    }

    private function service(string $secret = 'secret-yang-panjangnya-minimal-32-byte', string $issuer = 'catsheet'): JwtService
    {
        return new JwtService($secret, $issuer, ttlSeconds: 60, clock: $this->clock);
    }

    #[Test]
    public function issued_token_resolves_to_subject(): void
    {
        $token = $this->service()->issue(new GenericUser(['id' => 42]));

        self::assertCount(3, explode('.', $token)); // header.payload.signature
        self::assertSame('42', $this->service()->subject($token));
    }

    #[Test]
    public function expired_token_is_rejected(): void
    {
        $token = $this->service()->issue(new GenericUser(['id' => 42]));
        $this->clock->now = $this->clock->now->modify('+61 seconds');

        self::assertNull($this->service()->subject($token));
    }

    #[Test]
    public function token_signed_with_other_secret_is_rejected(): void
    {
        $token = $this->service('secret-lain-yang-juga-panjang-32-byte!')->issue(new GenericUser(['id' => 1]));

        self::assertNull($this->service()->subject($token));
    }

    #[Test]
    public function token_from_other_issuer_is_rejected(): void
    {
        $token = $this->service(issuer: 'aplikasi-lain')->issue(new GenericUser(['id' => 1]));

        self::assertNull($this->service()->subject($token));
    }

    #[Test]
    public function garbage_is_rejected(): void
    {
        self::assertNull($this->service()->subject('bukan.jwt.valid'));
    }
}
