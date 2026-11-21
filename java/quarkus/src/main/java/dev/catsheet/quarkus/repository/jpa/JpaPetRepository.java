package dev.catsheet.quarkus.repository.jpa;

import dev.catsheet.quarkus.domain.AdoptionStatus;
import dev.catsheet.quarkus.domain.Pet;
import dev.catsheet.quarkus.domain.PetId;
import dev.catsheet.quarkus.repository.PetRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Typed;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Adapter (Adapter pattern): mengimplementasikan port {@link PetRepository} pakai JPA/Hibernate,
 * menerjemahkan domain {@code Pet} <-> {@link PetEntity} lewat {@link PetMapper}.
 *
 * <h2>Kenapa save() tidak pakai merge()?</h2>
 * Entity punya {@code @Version}. Kalau kita bikin entity baru dari domain lalu {@code merge()},
 * versinya 0 padahal di DB sudah 1, hasilnya OptimisticLockException. Pola yang benar:
 * load entity (jadi <i>managed</i>), ubah field-nya, dan biarkan <b>dirty checking</b>
 * Hibernate menulis UPDATE saat transaksi commit. Tidak perlu panggil "update" apa pun.
 *
 * <h2>Transaksi</h2>
 * {@code @Transactional} default-nya {@code REQUIRED}: ikut transaksi yang sudah ada
 * (dari service), atau bikin baru kalau belum ada. Method read pakai {@code SUPPORTS}
 * biar bisa dipanggil tanpa transaksi.
 */
@ApplicationScoped
@Typed(JpaPetRepository.class)
public class JpaPetRepository implements PetRepository {

    private final PetEntityDao dao;

    public JpaPetRepository(PetEntityDao dao) {
        this.dao = dao;
    }

    @Override
    @Transactional
    public Pet save(Pet pet) {
        PetEntity existing = dao.findById(pet.id().toString());
        if (existing == null) {
            dao.persist(PetMapper.newEntity(pet));
        } else {
            PetMapper.copy(pet, existing); // managed entity: cukup ubah field-nya
        }
        return pet;
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public Optional<Pet> findById(PetId id) {
        return dao.findByIdOptional(id.toString()).map(PetMapper::toDomain);
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public List<Pet> findAll() {
        return dao.listAll(Sort.by("name")).stream()
                .map(PetMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public List<Pet> findByStatus(AdoptionStatus status) {
        // Panache query singkat: "status" == "from PetEntity where status = ?1"
        return dao.list("status", Sort.by("name"), status).stream()
                .map(PetMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public long count() {
        return dao.count();
    }
}
