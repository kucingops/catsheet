<?php

declare(strict_types=1);

namespace Catsheet\Oop\Abstraction;

use Catsheet\Oop\Encapsulation\Money;
use InvalidArgumentException;

final class EWallet extends PaymentMethod
{
    private const int MAX_PER_TRANSACTION = 10_000_000; // typed class constant (PHP 8.3)

    public function __construct(private readonly string $provider)
    {
    }

    public function name(): string
    {
        return "E-Wallet {$this->provider}";
    }

    protected function fee(Money $amount): Money
    {
        return Money::of(1_500, $amount->currency);
    }

    /** Override hook + tetap panggil parent (mirip super.validate() di Java). */
    protected function validate(Money $amount): void
    {
        parent::validate($amount);

        if ($amount->amount > self::MAX_PER_TRANSACTION) {
            throw new InvalidArgumentException('Melebihi limit e-wallet per transaksi.');
        }
    }
}
