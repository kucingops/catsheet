<?php

declare(strict_types=1);

namespace Catsheet\Oop\Abstraction;

use Catsheet\Oop\Encapsulation\Money;

final readonly class Receipt
{
    public function __construct(
        public string $method,
        public Money $amount,
        public Money $fee,
        public Money $total,
    ) {
    }
}
