package dev.catsheet.quarkus.repository;

import dev.catsheet.quarkus.domain.AdoptionStatus;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetId;

import java.util.List;
import java.util.Optional;

/**
 * Port (istilah Hexagonal Architecture) untuk penyimpanan Pet.
 *
 * <p>Service bergantung ke interface ini, bukan ke JPA atau Map. Itu
 * Dependency Inversion Principle (huruf D di SOLID): modul high-level (service)
 * dan low-level (JPA) sama-sama bergantung ke abstraksi.</p>
 *
 * <p>Implementasi yang tersedia:</p>
 * <ul>
 *   <li>{@code JpaPetRepository}: Hibernate ORM + Panache, data masuk database.</li>
 *   <li>{@code InMemoryPetRepository}: {@code ConcurrentHashMap}, tanpa persistence,
 *       data hilang saat aplikasi restart.</li>
 * </ul>
 * Pilihannya diatur oleh config {@code catsheet.storage} (lihat {@code StorageProducer}).
 */
public interface PetRepository {

    /** Insert kalau belum ada, update kalau sudah ada (upsert). */
    Pet save(Pet pet);

    Optional<Pet> findById(PetId id);

    List<Pet> findAll();

    List<Pet> findByStatus(AdoptionStatus status);

    long count();
}
