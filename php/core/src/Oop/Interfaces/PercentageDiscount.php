<?php

declare(strict_types=1);

namespace Catsheet\Oop\Interfaces;

use Catsheet\Oop\Encapsulation\Money;
use InvalidArgumentException;

final readonly class PercentageDiscount implements Discount
{
    public function __construct(private int $percent)
    {
        // clamp() baru ada di PHP 8.6. Di sini dipakai buat validasi: kalau di-clamp nilainya berubah, berarti di luar range.
        if (clamp($percent, 0, 100) !== $percent) {
            throw new InvalidArgumentException('Persen harus 0..100');
        }
    }

    public function apply(Money $price): Money
    {
        return $price->subtract($price->percentage($this->percent * 100));
    }
}
