<?php

declare(strict_types=1);

namespace Catsheet\Oop\StaticBinding;

/**
 * Late Static Binding: `static` = class yang dipanggil saat runtime, `self` = class tempat kode ditulis.
 * Ini alasan `User::create([...])` di Eloquent mengembalikan User, bukan Model.
 */
abstract class Model
{
    /** @var array<string, mixed> */
    public array $attributes = [];

    public static function make(array $attributes = []): static
    {
        $model = new static();
        $model->attributes = $attributes;

        return $model;
    }

    public static function makeWithSelf(): self
    {
        // `new self()` di abstract class bakal error; kalau class konkret, hasilnya selalu class ini.
        return static::make();
    }

    public static function table(): string
    {
        return strtolower(new \ReflectionClass(static::class)->getShortName()).'s';
    }
}
