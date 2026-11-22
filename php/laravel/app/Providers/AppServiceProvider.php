<?php

namespace App\Providers;

use App\Auth\JwtGuard;
use App\Auth\JwtService;
use App\Auth\PartnerApiKey;
use App\Models\User;
use App\Notes\EloquentNoteRepository;
use App\Notes\FileNoteRepository;
use App\Notes\NoteData;
use App\Notes\NoteRepository;
use App\Notes\QueryBuilderNoteRepository;
use App\Policies\NotePolicy;
use App\Support\LaravelClock;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
use Psr\Clock\ClockInterface;

/**
 * Service container = IoC container. `register()` cuma untuk binding (mirip @Bean di @Configuration),
 * `boot()` untuk hal yang butuh service lain sudah siap (auth driver, gate, event).
 */
class AppServiceProvider extends ServiceProvider
{
    /** Binding sederhana interface => class bisa ditulis sebagai property. */
    public array $singletons = [
        ClockInterface::class => LaravelClock::class,
    ];

    public function register(): void
    {
        // Persistence bisa ditukar lewat config, kode pemakai tetap minta NoteRepository.
        $this->app->bind(NoteRepository::class, fn (Application $app): NoteRepository => match (config('catsheet.notes_driver')) {
            'eloquent' => new EloquentNoteRepository,
            'query' => new QueryBuilderNoteRepository($app['db']->connection()),
            'file' => new FileNoteRepository(Storage::disk('local')),
            default => throw new InvalidArgumentException('NOTES_DRIVER tidak dikenal'),
        });

        $this->app->singleton(JwtService::class, fn (Application $app): JwtService => new JwtService(
            secret: (string) config('catsheet.jwt.secret'),
            issuer: (string) config('catsheet.jwt.issuer'),
            ttlSeconds: (int) config('catsheet.jwt.ttl'),
            clock: $app->make(ClockInterface::class),
        ));
    }

    public function boot(): void
    {
        // Custom guard driver "jwt" (class penuh yang implement Guard).
        Auth::extend('jwt', fn (Application $app, string $name, array $config): JwtGuard => new JwtGuard(
            Auth::createUserProvider($config['provider']),
            $app->make(JwtService::class),
            $app->make('request'),
        ));

        // Guard driver "partner-key" cukup dari satu callable.
        Auth::viaRequest('partner-key', new PartnerApiKey(config('catsheet.partner_keys')));

        // Authorization: Gate = closure, Policy = class per resource.
        Gate::define('view-reports', fn (User $user): bool => $user->isEditor());
        Gate::policy(NoteData::class, NotePolicy::class);
    }
}
