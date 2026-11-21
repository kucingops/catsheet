<?php

declare(strict_types=1);

namespace Catsheet\Solid;

final readonly class Rectangle implements Shape
{
    public function __construct(public float $width, public float $height)
    {
    }

    public function area(): float
    {
        return $this->width * $this->height;
    }
}
