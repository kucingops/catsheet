<?php

declare(strict_types=1);

namespace Catsheet\Oop\PropertyHooks;

use InvalidArgumentException;

/**
 * Property hooks (PHP 8.4): logika get/set nempel di property, mirip property di C#/Kotlin.
 * Jadi tidak perlu getter/setter boilerplate ala Java bean.
 */
final class Product implements HasSku
{
    /** Hook `set`: normalisasi + validasi tiap kali di-assign. */
    public string $sku {
        set {
            $value = strtoupper(trim($value));
            if (! preg_match('/^[A-Z]{3}-\d{3,}$/', $value)) {
                throw new InvalidArgumentException("SKU tidak valid: {$value}");
            }
            $this->sku = $value;
        }
    }

    public int $price {
        set => $value >= 0 ? $value : throw new InvalidArgumentException('Harga negatif');
    }

    /** Virtual property: tidak ada storage, dihitung tiap dibaca. Tidak bisa di-set. */
    public int $priceWithTax {
        get => intdiv($this->price * 111, 100); // PPN 11%
    }

    public function __construct(string $sku, int $price)
    {
        $this->sku = $sku;   // lewat hook set
        $this->price = $price;
    }
}
