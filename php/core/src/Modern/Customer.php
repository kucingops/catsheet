<?php

declare(strict_types=1);

namespace Catsheet\Modern;

final class Customer
{
    public function __construct(public int $id, public string $name)
    {
    }
}
