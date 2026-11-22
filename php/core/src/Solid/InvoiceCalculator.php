<?php

declare(strict_types=1);

namespace Catsheet\Solid;

/** SRP: cuma ngitung. Formatting & pengiriman ada di class lain (satu alasan untuk berubah). */
final class InvoiceCalculator
{
    /** @param list<array{price:int, qty:int}> $lines */
    public function total(array $lines, int $taxPercent = 11): int
    {
        $subtotal = array_sum(array_map(static fn (array $l): int => $l['price'] * $l['qty'], $lines));

        return $subtotal + intdiv($subtotal * $taxPercent, 100);
    }
}
