<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Strategy;

use InvalidArgumentException;

final class SameDayShipping implements ShippingStrategy
{
    public function cost(int $weightGram, int $distanceKm): int
    {
        if ($distanceKm > 40) {
            throw new InvalidArgumentException('Same day maksimal 40 km');
        }

        return 20_000 + $distanceKm * 1_500;
    }
}
