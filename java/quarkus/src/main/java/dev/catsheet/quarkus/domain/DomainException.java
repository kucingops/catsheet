package dev.catsheet.quarkus.domain;

/**
 * Induk semua exception bisnis. Unchecked (extends RuntimeException) supaya
 * nggak "bocor" ke semua signature method, dan supaya {@code @Transactional}
 * otomatis rollback (default-nya rollback untuk RuntimeException).
 */
public abstract sealed class DomainException extends RuntimeException
        permits PetAlreadyAdoptedException, PetNotFoundException {

    protected DomainException(String message) {
        super(message);
    }
}
