<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Strategy;

/** Strategy: algoritma bisa ditukar saat runtime. OCP: kurir baru = class baru. */
interface ShippingStrategy
{
    public function cost(int $weightGram, int $distanceKm): int;
}
