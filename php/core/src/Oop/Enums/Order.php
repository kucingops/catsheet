<?php

declare(strict_types=1);

namespace Catsheet\Oop\Enums;

use LogicException;

final class Order
{
    public private(set) OrderStatus $status = OrderStatus::DEFAULT;

    public function moveTo(OrderStatus $next): void
    {
        if (! $this->status->canTransitionTo($next)) {
            throw new LogicException("Tidak bisa pindah dari {$this->status->value} ke {$next->value}");
        }

        $this->status = $next;
    }
}
