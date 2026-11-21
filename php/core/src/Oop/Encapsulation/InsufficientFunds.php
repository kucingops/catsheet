<?php

declare(strict_types=1);

namespace Catsheet\Oop\Encapsulation;

use DomainException;

final class InsufficientFunds extends DomainException
{
    public static function forWithdrawal(Money $balance, Money $requested): self
    {
        return new self("Saldo {$balance} tidak cukup untuk tarik {$requested}.");
    }
}
