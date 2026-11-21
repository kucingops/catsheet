<?php

declare(strict_types=1);

namespace Catsheet\Oop\Enums;

/**
 * Backed enum (PHP 8.1). Enum di PHP itu object singleton per case, bisa punya method,
 * constant, dan implement interface. Mirip enum Java, tapi TIDAK bisa punya state per-case
 * (tidak ada constructor/field). Pakai `match` sebagai gantinya.
 */
enum OrderStatus: string implements HasLabel
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public const self DEFAULT = self::Pending;

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu pembayaran',
            self::Paid => 'Sudah dibayar',
            self::Shipped => 'Dalam pengiriman',
            self::Delivered => 'Sampai',
            self::Cancelled => 'Dibatalkan',
        };
    }

    /** State machine sederhana. `match` wajib exhaustive: case baru tanpa cabang = UnhandledMatchError. */
    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Pending => [self::Paid, self::Cancelled],
            self::Paid => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered],
            self::Delivered, self::Cancelled => [],
        }, strict: true);
    }

    public function isFinal(): bool
    {
        return $this === self::Delivered || $this === self::Cancelled;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $s): string => $s->value, self::cases());
    }
}
