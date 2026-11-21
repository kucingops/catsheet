<?php

declare(strict_types=1);

namespace Catsheet\Oop\Interfaces;

use Catsheet\Oop\Encapsulation\Money;

final readonly class FixedDiscount implements Discount
{
    public function __construct(private Money $off)
    {
    }

    public function apply(Money $price): Money
    {
        return $this->off->isGreaterThan($price) ? Money::zero($price->currency) : $price->subtract($this->off);
    }
}
