<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Observer;

final readonly class UserRegistered
{
    public function __construct(public string $email)
    {
    }
}
