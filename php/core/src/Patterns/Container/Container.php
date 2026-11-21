<?php

declare(strict_types=1);

namespace Catsheet\Patterns\Container;

use Closure;
use ReflectionClass;
use ReflectionNamedType;
use RuntimeException;

/**
 * Mini IoC container ala Laravel / Spring: binding interface -> implementasi,
 * singleton, dan autowiring constructor lewat Reflection.
 *
 * Bedanya dengan Spring: tidak ada component scan saat boot. Laravel juga begitu:
 * class di-resolve lazy saat pertama diminta, dan class konkret tanpa binding tetap bisa di-autowire.
 */
final class Container
{
    /** @var array<string, Closure(self): object> */
    private array $bindings = [];

    /** @var array<string, true> */
    private array $shared = [];

    /** @var array<string, object> */
    private array $instances = [];

    /** @var array<string, true> */
    private array $resolving = [];

    /**
     * @param class-string $abstract
     * @param class-string|Closure(self): object|null $concrete
     */
    public function bind(string $abstract, string|Closure|null $concrete = null): void
    {
        $concrete ??= $abstract;
        $this->bindings[$abstract] = $concrete instanceof Closure
            ? $concrete
            : fn (self $c): object => $c->build($concrete);
    }

    /** Mirip @Scope("singleton") / default bean scope di Spring. */
    public function singleton(string $abstract, string|Closure|null $concrete = null): void
    {
        $this->bind($abstract, $concrete);
        $this->shared[$abstract] = true;
    }

    /**
     * @template T of object
     * @param class-string<T> $abstract
     * @return T
     */
    public function make(string $abstract): object
    {
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }

        $object = isset($this->bindings[$abstract])
            ? ($this->bindings[$abstract])($this)
            : $this->build($abstract);

        if (isset($this->shared[$abstract])) {
            $this->instances[$abstract] = $object;
        }

        return $object;
    }

    private function build(string $class): object
    {
        if (isset($this->resolving[$class])) {
            throw new RuntimeException("Circular dependency saat resolve {$class}");
        }

        $reflection = new ReflectionClass($class);
        if (! $reflection->isInstantiable()) {
            throw new RuntimeException("{$class} tidak bisa di-instantiate (interface/abstract tanpa binding?)");
        }

        $this->resolving[$class] = true;
        try {
            $constructor = $reflection->getConstructor();
            if ($constructor === null) {
                return new $class();
            }

            $args = [];
            foreach ($constructor->getParameters() as $param) {
                $type = $param->getType();
                if ($type instanceof ReflectionNamedType && ! $type->isBuiltin()) {
                    $args[] = $this->make($type->getName());
                } elseif ($param->isDefaultValueAvailable()) {
                    $args[] = $param->getDefaultValue();
                } else {
                    throw new RuntimeException("Tidak bisa resolve parameter \${$param->getName()} di {$class}");
                }
            }

            return $reflection->newInstanceArgs($args);
        } finally {
            unset($this->resolving[$class]);
        }
    }
}
