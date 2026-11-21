<?php

declare(strict_types=1);

namespace Catsheet\Oop\Abstraction;

use Catsheet\Oop\Encapsulation\Money;

final class BankTransfer extends PaymentMethod
{
    public function __construct(private readonly string $bank)
    {
    }

    public function name(): string
    {
        return "Transfer {$this->bank}";
    }

    protected function fee(Money $amount): Money
    {
        return Money::zero($amount->currency);
    }
}
