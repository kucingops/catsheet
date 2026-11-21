package dev.catsheet.quarkus.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static dev.catsheet.quarkus.support.TestPets.FIXED_CLOCK;
import static dev.catsheet.quarkus.support.TestPets.TODAY;
import static dev.catsheet.quarkus.support.TestPets.cat;
import static dev.catsheet.quarkus.support.TestPets.dog;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PetTest {

    @Nested
    @DisplayName("Polymorphism")
    class Polymorphism {

        @Test
        void sameCallDifferentBehaviour() {
            List<Pet> pets = List.of(cat("Oyen", 2), dog("Bruno", 2, DogSize.LARGE));

            // Dipanggil lewat tipe Pet, yang jalan method milik subclass.
            assertThat(pets).extracting(Pet::sound).containsExactly("meong", "guk");
            assertThat(pets).extracting(Pet::baseAdoptionFee)
                    .containsExactly(Money.rupiah(150_000), Money.rupiah(300_000));
        }

        @ParameterizedTest(name = "kucing umur {0} senior? {1}")
        @CsvSource({"9, false", "10, true"})
        void catOverridesSeniorAgeHook(int age, boolean senior) {
            assertThat(cat("Mochi", age).isSenior(FIXED_CLOCK)).isEqualTo(senior);
        }

        @ParameterizedTest(name = "anjing umur {0} senior? {1}")
        @CsvSource({"7, false", "8, true"})
        void dogUsesDefaultSeniorAge(int age, boolean senior) {
            assertThat(dog("Doggo", age, DogSize.SMALL).isSenior(FIXED_CLOCK)).isEqualTo(senior);
        }
    }

    @Nested
    @DisplayName("Encapsulation: invariant dijaga object sendiri")
    class Encapsulation {

        @Test
        void newPetIsAvailable() {
            Pet pet = cat("Oyen", 1);

            assertThat(pet.isAvailable()).isTrue();
            assertThat(pet.adopter()).isEmpty();
        }

        @Test
        void adoptChangesStatusAndRecordsAdopter() {
            Pet pet = cat("Oyen", 1);

            pet.adopt("  bob ");

            assertThat(pet.status()).isEqualTo(AdoptionStatus.ADOPTED);
            assertThat(pet.adopter()).contains("bob");
        }

        @Test
        void cannotBeAdoptedTwice() {
            Pet pet = cat("Oyen", 1);
            pet.adopt("bob");

            assertThatThrownBy(() -> pet.adopt("alice"))
                    .isInstanceOf(PetAlreadyAdoptedException.class)
                    .hasMessageContaining(pet.id().toString());
            assertThat(pet.adopter()).contains("bob"); // state lama tidak berubah
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = "   ")
        void nameIsRequired(String name) {
            assertThatIllegalArgumentException().isThrownBy(() -> Cat.register(name, TODAY, true));
        }

        @Test
        void catNameLengthIsValidatedBeforeSuperConstructor() {
            String tooLong = "x".repeat(Cat.MAX_NAME_LENGTH + 1);

            assertThatIllegalArgumentException()
                    .isThrownBy(() -> Cat.register(tooLong, TODAY, true))
                    .withMessageContaining("maksimal");
        }

        @Test
        void dogSizeIsRequired() {
            assertThatThrownBy(() -> Dog.register("Bruno", TODAY, null)).isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("Identity")
    class Identity {

        @Test
        void entitiesAreEqualByIdNotByContent() {
            Cat original = cat("Oyen", 1);
            Cat sameIdDifferentState = new Cat(original.id(), "Ganti Nama", TODAY, false, "bob");
            Cat sameContentDifferentId = cat("Oyen", 1);

            assertThat(original).isEqualTo(sameIdDifferentState).isNotEqualTo(sameContentDifferentId);
        }

        @Test
        void reconstitutedPetWithAdopterIsAdopted() {
            Pet pet = new Dog(PetId.newId(), "Bruno", TODAY, DogSize.MEDIUM, "alice");

            assertThat(pet.status()).isEqualTo(AdoptionStatus.ADOPTED);
        }
    }
}
