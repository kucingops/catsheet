<?php

declare(strict_types=1);

namespace Catsheet\Oop\Traits;

/** Dua trait punya method yang sama -> wajib resolve konflik pakai `insteadof` dan `as`. */
final class Greeter
{
    use HasLogger;
    use SaysHelloInIndonesian, SaysHelloInEnglish {
        SaysHelloInIndonesian::hello insteadof SaysHelloInEnglish;
        SaysHelloInEnglish::hello as helloEnglish;
    }

    public function greet(string $name): string
    {
        $text = "{$this->hello()} {$name} / {$this->helloEnglish()} {$name}";
        $this->log($text);

        return $text;
    }

    protected function logPrefix(): string
    {
        return 'greeter';
    }
}
