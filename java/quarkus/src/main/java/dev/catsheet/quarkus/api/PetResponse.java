package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Dog;
import dev.catsheet.quarkus.domain.Pet;

import java.time.Clock;
import java.time.LocalDate;

/** DTO response. Domain tidak pernah langsung diserialisasi ke JSON. */
public record PetResponse(
        String id,
        String name,
        String species,
        LocalDate birthDate,
        int ageInYears,
        String status,
        String adopter,
        String summary) {

    public static PetResponse from(Pet pet, Clock clock) {
        return new PetResponse(
                pet.id().toString(),
                pet.name(),
                pet.species(),
                pet.birthDate(),
                pet.ageInYears(clock),
                pet.status().name(),
                pet.adopter().orElse(null),
                summary(pet));
    }

    /** Pattern matching + guard ({@code when}) di switch, exhaustive karena Pet sealed. */
    static String summary(Pet pet) {
        return switch (pet) {
            case Cat cat when cat.indoor() -> "Kucing rumahan, bilang " + cat.sound();
            case Cat cat -> "Kucing outdoor, bilang " + cat.sound();
            case Dog dog -> "Anjing ukuran " + dog.size().name().toLowerCase() + ", bilang " + dog.sound();
        };
    }
}
