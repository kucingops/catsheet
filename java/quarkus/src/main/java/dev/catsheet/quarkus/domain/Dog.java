package dev.catsheet.quarkus.domain;

import java.time.LocalDate;
import java.util.Objects;

public final class Dog extends Pet {

    private final DogSize size;

    public Dog(PetId id, String name, LocalDate birthDate, DogSize size, String adopter) {
        this.size = Objects.requireNonNull(size, "size"); // Java 25: sebelum super(...)
        super(id, name, birthDate, adopter);
    }

    public static Dog register(String name, LocalDate birthDate, DogSize size) {
        return new Dog(PetId.newId(), name, birthDate, size, null);
    }

    public DogSize size() {
        return size;
    }

    @Override
    public Money baseAdoptionFee() {
        return size.baseFee();
    }

    @Override
    public String sound() {
        return "guk";
    }

    @Override
    public String species() {
        return "DOG";
    }
    // seniorAgeInYears() tidak di-override: pakai default 8 dari Pet.
}
