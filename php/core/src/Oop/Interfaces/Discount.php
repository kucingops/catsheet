<?php

declare(strict_types=1);

namespace Catsheet\Oop\Interfaces;

use Catsheet\Oop\Encapsulation\Money;

/**
 * Interface = kontrak murni (apa yang bisa dilakukan), tanpa state.
 * Class boleh implement banyak interface, tapi cuma extend satu class (sama kayak Java).
 */
interface Discount
{
    public function apply(Money $price): Money;
}
