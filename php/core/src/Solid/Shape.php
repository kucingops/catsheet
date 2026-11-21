<?php

declare(strict_types=1);

namespace Catsheet\Solid;

/*
 * LSP: subclass harus bisa menggantikan parent tanpa merusak ekspektasi pemanggil.
 * Contoh klasik pelanggaran: Square extends Rectangle (setWidth ikut ubah height).
 * Solusi: jangan paksa hierarki; pisahkan jadi tipe sejajar yang sama-sama implement Shape.
 */
interface Shape
{
    public function area(): float;
}
