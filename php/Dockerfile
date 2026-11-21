# Image dev buat jalanin cheatsheet ini tanpa install PHP 8.6 di laptop.
#   docker build -t catsheet-php php/
#   docker run --rm -v "$PWD/php/core:/app" catsheet-php composer test
FROM php:8.6-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libzip-dev unzip git \
    && docker-php-ext-install mbstring zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
