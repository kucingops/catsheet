<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Strategy;

final class RegularShipping implements ShippingStrategy
{
    public function cost(int $weightGram, int $distanceKm): int
    {
        return 9_000 + (int) ceil($weightGram / 1000) * 2_000 + $distanceKm * 100;
    }
}
