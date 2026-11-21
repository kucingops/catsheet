<?php

declare(strict_types=1);

namespace Catsheet\Solid;

final readonly class Square implements Shape
{
    public function __construct(public float $side)
    {
    }

    public function area(): float
    {
        return $this->side ** 2;
    }
}
