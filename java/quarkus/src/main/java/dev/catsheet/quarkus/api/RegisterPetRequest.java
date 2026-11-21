package dev.catsheet.quarkus.api;

import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Dog;
import dev.catsheet.quarkus.domain.DogSize;
import dev.catsheet.quarkus.domain.Pet;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

/**
 * Request body. Validasi format (wajib isi, panjang) di sini pakai Bean Validation;
 * validasi aturan bisnis tetap di domain.
 */
public record RegisterPetRequest(
        @NotBlank @Size(max = Cat.MAX_NAME_LENGTH) String name,
        @NotNull @PastOrPresent java.time.LocalDate birthDate,
        @NotNull Species species,
        Boolean indoor,
        DogSize size) {

    public enum Species { CAT, DOG }

    public Pet toDomain() {
        return switch (species) {
            case CAT -> Cat.register(name, birthDate, Boolean.TRUE.equals(indoor));
            case DOG -> Dog.register(name, birthDate, size == null ? DogSize.MEDIUM : size);
        };
    }
}
