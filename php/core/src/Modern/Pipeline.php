<?php

declare(strict_types=1);

namespace Catsheet\Modern;

/**
 * Fitur bahasa terbaru, dikumpulkan di satu tempat buat referensi cepat.
 *
 * PHP 8.6: partial function application `f(?, 2)`, fungsi `clamp()`.
 * PHP 8.5: pipe operator `|>`, `clone($obj, [...])`, `#[\NoDiscard]`, `array_first()` / `array_last()`.
 */
final class Pipeline
{
    /** Pipe operator: baca kiri ke kanan, bukan nested dari dalam ke luar. */
    public static function slug(string $title): string
    {
        return $title
            |> trim(...)
            |> strtolower(...)
            |> (fn (string $s): string => preg_replace('/[^a-z0-9]+/', '-', $s))
            |> (fn (string $s): string => trim($s, '-'));
    }

    /**
     * Partial function application (PHP 8.6): `?` = argumen yang diisi nanti.
     * `str_pad(?, 6, '0', STR_PAD_LEFT)` menghasilkan Closure dengan 1 parameter.
     *
     * @param list<int> $numbers
     * @return list<string>
     */
    public static function invoiceNumbers(array $numbers): array
    {
        $pad = str_pad(?, 6, '0', STR_PAD_LEFT);

        return array_map(static fn (int $n): string => 'INV-'.$pad((string) $n), $numbers);
    }

    /** @param list<int> $scores */
    public static function normalizedScores(array $scores): array
    {
        return array_map(clamp(?, 0, 100), $scores);
    }

    /** @param list<string> $items */
    public static function firstAndLast(array $items): array
    {
        return [array_first($items), array_last($items)];
    }

    /** Warning kalau return value-nya dibuang begitu saja. */
    #[\NoDiscard('hasil discount harus dipakai, method ini tidak mengubah apa-apa')]
    public static function discounted(int $price, int $percent): int
    {
        return $price - intdiv($price * $percent, 100);
    }
}
