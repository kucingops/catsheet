<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Strategy;

final class ShippingCalculator
{
    /** @param array<string, ShippingStrategy> $strategies */
    public function __construct(private readonly array $strategies)
    {
    }

    public function quote(string $courier, int $weightGram, int $distanceKm): int
    {
        $strategy = $this->strategies[$courier] ?? throw new \InvalidArgumentException("Kurir {$courier} tidak dikenal");

        return $strategy->cost($weightGram, $distanceKm);
    }
}
