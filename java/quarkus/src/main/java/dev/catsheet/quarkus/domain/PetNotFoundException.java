package dev.catsheet.quarkus.domain;

public final class PetNotFoundException extends DomainException {

    public PetNotFoundException(PetId id) {
        super("Pet " + id + " tidak ditemukan");
    }
}
