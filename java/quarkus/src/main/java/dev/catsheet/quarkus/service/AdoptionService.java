package dev.catsheet.quarkus.service;

import dev.catsheet.quarkus.domain.AdoptionFeePolicy;
import dev.catsheet.quarkus.domain.AdoptionStatus;
import dev.catsheet.quarkus.domain.Money;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetId;
import dev.catsheet.quarkus.domain.PetNotFoundException;
import dev.catsheet.quarkus.repository.PetRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/**
 * Application service: mengorkestrasi use case. Aturan bisnis inti ada di domain
 * ({@link Pet#adopt(String)}), service cuma merangkai: ambil data, panggil domain, simpan.
 *
 * <p>Semua dependency berupa abstraksi dan masuk lewat constructor, jadi unit test-nya
 * cukup {@code new AdoptionService(mockRepo, lambdaPolicy, fixedClock)}. Tanpa Quarkus, tanpa DB.</p>
 */
@ApplicationScoped
public class AdoptionService {

    private final PetRepository pets;
    private final AdoptionFeePolicy feePolicy;
    private final Clock clock;

    public AdoptionService(PetRepository pets, AdoptionFeePolicy feePolicy, Clock clock) {
        this.pets = pets;
        this.feePolicy = feePolicy;
        this.clock = clock;
    }

    @Transactional
    public Pet register(Pet pet) {
        return pets.save(pet);
    }

    public List<Pet> available() {
        return pets.findByStatus(AdoptionStatus.AVAILABLE);
    }

    public Pet get(PetId id) {
        return pets.findById(id).orElseThrow(() -> new PetNotFoundException(id));
    }

    public Money quote(PetId id) {
        return feePolicy.feeFor(get(id));
    }

    /**
     * {@code @Transactional}: kalau ada RuntimeException (misal PetAlreadyAdoptedException),
     * transaksi di-rollback. Catatan: annotation ini bekerja lewat interceptor/proxy CDI,
     * jadi tidak berlaku kalau method dipanggil dari dalam class yang sama (self-invocation),
     * sama seperti di Spring.
     */
    @Transactional
    public AdoptionReceipt adopt(PetId id, String adopter) {
        Pet pet = get(id);
        Money fee = feePolicy.feeFor(pet);   // hitung sebelum status berubah
        pet.adopt(adopter);                  // invariant dijaga domain
        pets.save(pet);
        return new AdoptionReceipt(pet.id(), pet.name(), adopter, fee, LocalDate.now(clock));
    }
}
