package dev.catsheet.quarkus.repository.jpa;

import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Dog;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetId;

/**
 * Mapper domain <-> entity. Ditulis manual (bisa juga pakai MapStruct).
 *
 * <p>Perhatikan {@code switch} di sini: pattern matching untuk sealed class.
 * Tidak ada {@code default}; kalau nanti ada {@code Bird extends Pet}, kode ini
 * gagal compile sampai Bird ditangani. Itu keuntungan sealed + exhaustive switch.</p>
 */
public final class PetMapper {

    private PetMapper() {
    }

    public static Pet toDomain(PetEntity entity) {
        PetId id = PetId.of(entity.id);
        return switch (entity) {
            case CatEntity cat -> new Cat(id, cat.name, cat.birthDate, Boolean.TRUE.equals(cat.indoor), cat.adopter);
            case DogEntity dog -> new Dog(id, dog.name, dog.birthDate, dog.size, dog.adopter);
            default -> throw new IllegalStateException("Entity tidak dikenal: " + entity.getClass());
            // PetEntity bukan sealed (Hibernate butuh bikin proxy subclass), jadi di sini default masih perlu.
        };
    }

    /** Bikin entity baru dari domain (untuk INSERT). */
    public static PetEntity newEntity(Pet pet) {
        PetEntity entity = switch (pet) {
            case Cat _ -> new CatEntity();   // Java 22+: unnamed variable `_`
            case Dog _ -> new DogEntity();
        };
        entity.id = pet.id().toString();
        copy(pet, entity);
        return entity;
    }

    /** Salin state domain ke entity (dipakai untuk INSERT maupun UPDATE). */
    public static void copy(Pet pet, PetEntity entity) {
        entity.name = pet.name();
        entity.birthDate = pet.birthDate();
        entity.status = pet.status();
        entity.adopter = pet.adopter().orElse(null);
        switch (pet) {
            case Cat cat when entity instanceof CatEntity ce -> ce.indoor = cat.indoor();
            case Dog dog when entity instanceof DogEntity de -> de.size = dog.size();
            default -> throw new IllegalStateException("Species tidak cocok: " + pet + " vs " + entity.getClass());
        }
    }
}
