<?php

declare(strict_types=1);

namespace Catsheet\Oop\Abstraction;

use Catsheet\Oop\Encapsulation\Money;

final class CreditCard extends PaymentMethod
{
    public function __construct(private readonly string $cardNumber)
    {
    }

    public function name(): string
    {
        return 'Credit Card **** '.substr($this->cardNumber, -4);
    }

    /** Fee 2.5% */
    protected function fee(Money $amount): Money
    {
        return $amount->percentage(250);
    }
}
