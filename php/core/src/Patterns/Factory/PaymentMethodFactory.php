<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Factory;

use Catsheet\Oop\Abstraction\BankTransfer;
use Catsheet\Oop\Abstraction\CreditCard;
use Catsheet\Oop\Abstraction\EWallet;
use Catsheet\Oop\Abstraction\PaymentMethod;
use InvalidArgumentException;

/** Simple Factory: pemanggil tidak perlu tahu class konkret mana yang dibuat. */
final class PaymentMethodFactory
{
    /** @param array<string, string> $data */
    public static function fromArray(array $data): PaymentMethod
    {
        return match ($data['type'] ?? null) {
            'card' => new CreditCard($data['number']),
            'ewallet' => new EWallet($data['provider']),
            'transfer' => new BankTransfer($data['bank']),
            default => throw new InvalidArgumentException('Tipe pembayaran tidak dikenal'),
        };
    }
}
