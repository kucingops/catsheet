<?php

namespace App\Auth;

use Illuminate\Auth\GenericUser;
use Illuminate\Http\Request;

/**
 * Guard berbasis closure (Auth::viaRequest): cocok untuk machine-to-machine pakai API key.
 * "User"-nya bukan baris di tabel users, cuma GenericUser dari config. Jadi auth juga bisa tanpa persistence.
 *
 * Key disimpan sebagai SHA-256 di config, dibandingkan pakai hash_equals (constant time, anti timing attack).
 */
final readonly class PartnerApiKey
{
    /** @param array<string, string> $keys nama partner => sha256(api key) */
    public function __construct(private array $keys) {}

    public function __invoke(Request $request): ?GenericUser
    {
        $given = $request->header('X-Api-Key');
        if (! is_string($given) || $given === '') {
            return null;
        }

        $hash = hash('sha256', $given);
        foreach ($this->keys as $partner => $expected) {
            if (hash_equals($expected, $hash)) {
                return new GenericUser(['id' => "partner:{$partner}", 'name' => $partner]);
            }
        }

        return null;
    }
}
