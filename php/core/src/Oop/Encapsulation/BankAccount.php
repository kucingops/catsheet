<?php

declare(strict_types=1);

namespace Catsheet\Oop\Encapsulation;

/**
 * Encapsulation: state cuma bisa berubah lewat method yang menjaga invariant
 * ("saldo tidak boleh minus").
 *
 * `public private(set)` = asymmetric visibility (PHP 8.4).
 * Dibaca dari luar boleh (`$account->balance`), ditulis cuma dari dalam class.
 * Dulu harus bikin property private + getter `getBalance()`.
 */
final class BankAccount
{
    public private(set) Money $balance;

    /** @var list<string> */
    private array $history = [];

    public function __construct(
        public readonly string $number,
        string $currency = 'IDR',
    ) {
        $this->balance = Money::zero($currency);
    }

    public function deposit(Money $money): void
    {
        $this->balance = $this->balance->add($money);
        $this->history[] = "deposit {$money}";
    }

    public function withdraw(Money $money): void
    {
        if ($money->isGreaterThan($this->balance)) {
            throw InsufficientFunds::forWithdrawal($this->balance, $money);
        }

        $this->balance = $this->balance->subtract($money);
        $this->history[] = "withdraw {$money}";
    }

    /** Kembalikan copy, bukan reference ke array internal. Array di PHP itu value type (copy-on-write). */
    public function history(): array
    {
        return $this->history;
    }
}
