<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Observer;

/**
 * Observer / pub-sub: publisher tidak kenal listener-nya.
 * Listener di-register per class event; Laravel Event dan Spring ApplicationEvent konsepnya sama.
 */
final class EventDispatcher
{
    /** @var array<class-string, list<callable(object): void>> */
    private array $listeners = [];

    /** @param class-string $event */
    public function listen(string $event, callable $listener): void
    {
        $this->listeners[$event][] = $listener;
    }

    public function dispatch(object $event): object
    {
        foreach ($this->listeners[$event::class] ?? [] as $listener) {
            $listener($event);
        }

        return $event;
    }
}
