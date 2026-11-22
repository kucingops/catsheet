package dev.catsheet.quarkus.repository.memory;

import dev.catsheet.quarkus.domain.AdoptionStatus;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetId;
import dev.catsheet.quarkus.repository.PetRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Typed;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Penyimpanan TANPA persistence: data cuma hidup di heap JVM.
 *
 * <p>Kapan dipakai di dunia nyata: cache, data referensi kecil, prototipe,
 * atau test double (fake) yang lebih realistis daripada mock.</p>
 *
 * <p>Catatan penting:</p>
 * <ul>
 *   <li>{@code @ApplicationScoped} = satu instance per aplikasi, jadi Map-nya di-share semua
 *       request. Wajib thread-safe, makanya pakai {@link ConcurrentHashMap}, bukan HashMap.</li>
 *   <li>Tidak ada transaksi: kalau service gagal di tengah jalan, perubahan yang sudah
 *       di-{@code put} tidak di-rollback. Bandingkan dengan versi JPA.</li>
 *   <li>Object yang dikembalikan adalah referensi yang sama dengan yang disimpan
 *       (mirip "managed entity" di JPA). Mengubah object tanpa {@code save()} tetap
 *       mengubah isi store. Di sistem serius biasanya disimpan salinannya.</li>
 *   <li>Nggak scale horizontal: 2 instance aplikasi = 2 isi Map yang berbeda.</li>
 * </ul>
 *
 * <p>{@code @Typed(InMemoryPetRepository.class)}: bean ini hanya terdaftar sebagai tipe
 * concrete-nya, bukan sebagai {@link PetRepository}. Kalau tidak, CDI akan bingung
 * (ambiguous dependency) karena ada dua bean yang sama-sama PetRepository.</p>
 */
@ApplicationScoped
@Typed(InMemoryPetRepository.class)
public class InMemoryPetRepository implements PetRepository {

    private final Map<PetId, Pet> store = new ConcurrentHashMap<>();

    @Override
    public Pet save(Pet pet) {
        store.put(pet.id(), pet);
        return pet;
    }

    @Override
    public Optional<Pet> findById(PetId id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<Pet> findAll() {
        return store.values().stream()
                .sorted(Comparator.comparing(Pet::name))
                .toList(); // Java 16+: hasilnya unmodifiable list
    }

    @Override
    public List<Pet> findByStatus(AdoptionStatus status) {
        return findAll().stream()
                .filter(pet -> pet.status() == status)
                .toList();
    }

    @Override
    public long count() {
        return store.size();
    }

    /** Khusus test: reset state antar test. */
    public void clear() {
        store.clear();
    }
}
