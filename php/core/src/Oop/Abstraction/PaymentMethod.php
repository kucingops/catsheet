<?php

declare(strict_types=1);

namespace Catsheet\Oop\Abstraction;

use Catsheet\Oop\Encapsulation\Money;
use InvalidArgumentException;

/**
 * Abstract class = kontrak + sebagian implementasi.
 *
 * `pay()` adalah Template Method: alurnya dikunci (`final`), subclass cuma isi langkah yang beda
 * (`fee()`, `name()`, dan opsional `validate()`).
 */
abstract class PaymentMethod
{
    final public function pay(Money $amount): Receipt
    {
        $this->validate($amount);
        $fee = $this->fee($amount);

        return new Receipt(
            method: $this->name(),
            amount: $amount,
            fee: $fee,
            total: $amount->add($fee),
        );
    }

    abstract public function name(): string;

    abstract protected function fee(Money $amount): Money;

    /** Hook method: default-nya boleh, subclass boleh override. */
    protected function validate(Money $amount): void
    {
        if ($amount->amount === 0) {
            throw new InvalidArgumentException('Nominal pembayaran harus > 0.');
        }
    }
}
