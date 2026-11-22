package dev.catsheet.quarkus.domain;

public final class PetAlreadyAdoptedException extends DomainException {

    public PetAlreadyAdoptedException(PetId id) {
        super("Pet " + id + " sudah diadopsi");
    }
}
