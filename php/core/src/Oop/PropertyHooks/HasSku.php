<?php

declare(strict_types=1);

namespace Catsheet\Oop\PropertyHooks;

/** Sejak PHP 8.4 interface boleh mendeklarasikan property (wajib ada get dan/atau set). */
interface HasSku
{
    public string $sku { get; }
}
