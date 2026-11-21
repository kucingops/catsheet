<?php

return [
    /*
     * Mau simpan Note di mana? Ganti tanpa ubah controller/service.
     *   eloquent : ORM (Active Record)
     *   query    : Query Builder + raw SQL (tanpa ORM)
     *   file     : file JSON di storage/app (tanpa database)
     */
    'notes_driver' => env('NOTES_DRIVER', 'eloquent'),

    'jwt' => [
        'secret' => env('JWT_SECRET', env('APP_KEY')),
        'issuer' => env('APP_URL', 'http://localhost'),
        'ttl' => (int) env('JWT_TTL', 3600),
    ],

    /*
     * API key partner, disimpan sebagai sha256. Contoh .env:
     *   PARTNER_API_KEYS="acme:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
     */
    'partner_keys' => collect(explode(',', (string) env('PARTNER_API_KEYS', '')))
        ->filter()
        ->mapWithKeys(function (string $pair): array {
            [$name, $hash] = explode(':', $pair, 2);

            return [$name => $hash];
        })
        ->all(),
];
