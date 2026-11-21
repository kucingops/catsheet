<?php

declare(strict_types=1);

namespace Catsheet\Modern;

use ReflectionClass;

/**
 * Lazy objects (PHP 8.4): object "kosong" yang baru diinisialisasi saat property-nya disentuh.
 * Ini mekanisme di balik lazy-loading proxy ORM (Doctrine) — sama konsepnya dengan Hibernate proxy
 * yang bikin LazyInitializationException di Java.
 */
final class LazyLoading
{
    public static int $loads = 0;

    public static function customer(int $id): Customer
    {
        return new ReflectionClass(Customer::class)->newLazyGhost(
            static function (Customer $ghost) use ($id): void {
                self::$loads++; // anggap ini query SELECT ke database
                $ghost->__construct($id, "Customer #{$id}");
            },
        );
    }
}
