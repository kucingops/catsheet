<?php

declare(strict_types=1);

namespace Catsheet\Solid;

/**
 * DIP: dependency masuk lewat constructor (constructor injection) dan bertipe interface.
 * Di test tinggal kasih fake/mock Notifier, tanpa SMTP beneran.
 */
final readonly class InvoiceMailer
{
    public function __construct(
        private InvoiceCalculator $calculator,
        private Notifier $notifier,
    ) {
    }

    /** @param list<array{price:int, qty:int}> $lines */
    public function send(string $email, array $lines): int
    {
        $total = $this->calculator->total($lines);
        $this->notifier->send($email, "Total tagihan: {$total}");

        return $total;
    }
}
