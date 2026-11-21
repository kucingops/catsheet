<?php

declare(strict_types=1);

namespace Catsheet\Oop\Encapsulation;

use InvalidArgumentException;

/**
 * Value object: immutable, dibandingkan berdasarkan nilai, bukan identitas.
 *
 * - `readonly class` (PHP 8.2): semua property readonly, cuma bisa diisi sekali di constructor.
 * - Simpan uang sebagai integer satuan terkecil (sen/rupiah), jangan float.
 * - Constructor private + named constructor (`of`, `zero`) = validasi terpusat.
 */
final readonly class Money
{
    private function __construct(
        public int $amount,
        public string $currency,
    ) {
    }

    public static function of(int $amount, string $currency = 'IDR'): self
    {
        if ($amount < 0) {
            throw new InvalidArgumentException('Amount tidak boleh negatif.');
        }
        if (strlen($currency) !== 3) {
            throw new InvalidArgumentException('Currency harus kode ISO 3 huruf.');
        }

        return new self($amount, strtoupper($currency));
    }

    public static function zero(string $currency = 'IDR'): self
    {
        return self::of(0, $currency);
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->amount + $other->amount, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return self::of($this->amount - $other->amount, $this->currency);
    }

    /** Persen dalam basis point biar tetap integer: 250 = 2.5% */
    public function percentage(int $basisPoints): self
    {
        return new self(intdiv($this->amount * $basisPoints, 10_000), $this->currency);
    }

    public function isGreaterThan(self $other): bool
    {
        $this->assertSameCurrency($other);

        return $this->amount > $other->amount;
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount && $this->currency === $other->currency;
    }

    public function __toString(): string
    {
        return sprintf('%s %s', $this->currency, number_format($this->amount, 0, ',', '.'));
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException("Beda currency: {$this->currency} vs {$other->currency}");
        }
    }
}
