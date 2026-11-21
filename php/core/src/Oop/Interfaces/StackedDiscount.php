<?php

declare(strict_types=1);

namespace Catsheet\Oop\Interfaces;

use Catsheet\Oop\Encapsulation\Money;

/** Composite: kumpulan Discount yang juga sebuah Discount. */
final readonly class StackedDiscount implements Discount
{
    /** @var list<Discount> */
    private array $discounts;

    public function __construct(Discount ...$discounts)
    {
        $this->discounts = array_values($discounts);
    }

    public function apply(Money $price): Money
    {
        return array_reduce(
            $this->discounts,
            static fn (Money $carry, Discount $d): Money => $d->apply($carry),
            $price,
        );
    }
}
