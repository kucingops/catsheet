<?php

declare(strict_types=1);

namespace Catsheet\Oop\Abstraction;

use Catsheet\Oop\Encapsulation\Money;

/**
 * Polymorphism: Checkout cuma kenal tipe `PaymentMethod`.
 * Mau CreditCard, EWallet, atau BankTransfer, kodenya sama; perilakunya beda.
 * Tambah metode bayar baru = tambah class, Checkout tidak diubah (Open/Closed).
 */
final class Checkout
{
    /**
     * @param array<string, PaymentMethod> $methods
     * @return array<string, Receipt>
     */
    public function compare(Money $amount, array $methods): array
    {
        return array_map(static fn (PaymentMethod $m): Receipt => $m->pay($amount), $methods);
    }

    /** @param array<string, PaymentMethod> $methods */
    public function cheapest(Money $amount, array $methods): Receipt
    {
        $receipts = $this->compare($amount, $methods);
        usort($receipts, static fn (Receipt $a, Receipt $b): int => $a->total->amount <=> $b->total->amount);

        return $receipts[0];
    }
}
