<?php

declare(strict_types=1);

namespace Catsheet\Oop\Interfaces;

use Catsheet\Oop\Encapsulation\Money;

/** Null Object pattern: daripada `if ($discount !== null)` di mana-mana. */
final readonly class NoDiscount implements Discount
{
    public function apply(Money $price): Money
    {
        return $price;
    }
}
