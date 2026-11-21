package dev.catsheet.quarkus.repository;

import dev.catsheet.quarkus.repository.memory.InMemoryPetRepository;
import org.junit.jupiter.api.BeforeEach;

/** Implementasi tanpa persistence, dites dengan kontrak yang sama dengan versi JPA. */
class InMemoryPetRepositoryTest extends PetRepositoryContract {

    private InMemoryPetRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InMemoryPetRepository(); // plain new, tanpa CDI
    }

    @Override
    protected PetRepository repository() {
        return repository;
    }
}
