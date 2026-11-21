package dev.catsheet.quarkus.repository;

import dev.catsheet.quarkus.domain.Cat;
import dev.catsheet.quarkus.domain.Dog;
import dev.catsheet.quarkus.domain.DogSize;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.repository.jpa.CatEntity;
import dev.catsheet.quarkus.repository.jpa.DogEntity;
import dev.catsheet.quarkus.repository.jpa.PetEntity;
import dev.catsheet.quarkus.repository.jpa.PetMapper;
import org.junit.jupiter.api.Test;

import static dev.catsheet.quarkus.support.TestPets.cat;
import static dev.catsheet.quarkus.support.TestPets.dog;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

/** Mapper bisa dites tanpa database: entity cuma POJO selama tidak di-persist. */
class PetMapperTest {

    @Test
    void roundTripKeepsSubtypeAndState() {
        Dog dog = dog("Bruno", 3, DogSize.SMALL);
        dog.adopt("bob");

        PetEntity entity = PetMapper.newEntity(dog);
        Pet back = PetMapper.toDomain(entity);

        assertThat(entity).isInstanceOf(DogEntity.class);
        assertThat(back).isInstanceOf(Dog.class).isEqualTo(dog);
        assertThat(back).usingRecursiveComparison().isEqualTo(dog);
    }

    @Test
    void catMapsToCatEntity() {
        Cat cat = cat("Oyen", 1);

        PetEntity entity = PetMapper.newEntity(cat);

        assertThat(entity).isInstanceOfSatisfying(CatEntity.class, ce -> assertThat(ce.indoor).isTrue());
    }

    @Test
    void copyRejectsSpeciesMismatch() {
        assertThatIllegalStateException().isThrownBy(() -> PetMapper.copy(cat("Oyen", 1), new DogEntity()));
    }
}
