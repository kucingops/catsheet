package dev.catsheet.quarkus.repository;

import dev.catsheet.quarkus.domain.AdoptionStatus;
import dev.catsheet.quarkus.domain.DogSize;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetId;
import org.junit.jupiter.api.Test;

import static dev.catsheet.quarkus.support.TestPets.cat;
import static dev.catsheet.quarkus.support.TestPets.dog;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contract test: OOP dipakai di test juga.
 *
 * <p>Abstract class ini berisi semua aturan yang WAJIB dipenuhi implementasi
 * {@link PetRepository} mana pun (Liskov Substitution Principle: implementasi apa pun
 * harus bisa menggantikan interface-nya tanpa mengubah perilaku). Subclass cukup
 * menyediakan instance repository-nya.</p>
 *
 * <ul>
 *   <li>{@code InMemoryPetRepositoryTest}: unit test biasa, super cepat.</li>
 *   <li>{@code JpaPetRepositoryTest}: {@code @QuarkusTest} dengan database H2.</li>
 * </ul>
 */
public abstract class PetRepositoryContract {

    protected abstract PetRepository repository();

    @Test
    void savedPetCanBeFoundById() {
        Pet oyen = repository().save(cat("Oyen", 2));

        assertThat(repository().findById(oyen.id()))
                .get()
                .usingRecursiveComparison()
                .isEqualTo(oyen);
    }

    @Test
    void unknownIdReturnsEmpty() {
        assertThat(repository().findById(PetId.newId())).isEmpty();
    }

    @Test
    void saveTwiceUpdatesInsteadOfDuplicating() {
        Pet bruno = repository().save(dog("Bruno", 4, DogSize.LARGE));
        long before = repository().count();

        bruno.adopt("bob");
        repository().save(bruno);

        assertThat(repository().count()).isEqualTo(before);
        assertThat(repository().findById(bruno.id()))
                .get()
                .extracting(Pet::status)
                .isEqualTo(AdoptionStatus.ADOPTED);
    }

    @Test
    void findByStatusFiltersAndSortsByName() {
        Pet zeta = repository().save(cat("Zeta", 1));
        Pet alpha = repository().save(dog("Alpha", 1, DogSize.SMALL));
        Pet adopted = cat("Beta", 1);
        adopted.adopt("bob");
        repository().save(adopted);

        assertThat(repository().findByStatus(AdoptionStatus.AVAILABLE))
                .extracting(Pet::id)
                .containsExactly(alpha.id(), zeta.id());
        assertThat(repository().findAll()).hasSize(3);
    }
}
