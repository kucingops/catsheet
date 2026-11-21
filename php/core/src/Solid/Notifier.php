<?php

declare(strict_types=1);

namespace Catsheet\Solid;

/** ISP + DIP: interface kecil, high-level module bergantung ke abstraksi ini, bukan ke SmtpMailer. */
interface Notifier
{
    public function send(string $to, string $message): void;
}
