package cheat.springboot.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persistence DENGAN JPA (Hibernate). Adapter: terjemahkan Product <-> ProductEntity,
 * jadi detail JPA tidak bocor ke service.
 */
@Repository
@ConditionalOnProperty(name = "catsheet.store", havingValue = "jpa", matchIfMissing = true)
public class JpaProductStore implements ProductStore {

    private final ProductJpaRepository repository;

    public JpaProductStore(ProductJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Product save(Product product) {
        return repository.save(ProductEntity.from(product)).toDomain();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> findById(long id) {
        return repository.findById(id).map(ProductEntity::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> findAll() {
        return repository.findAll().stream().map(ProductEntity::toDomain).toList();
    }

    @Override
    public boolean deleteById(long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    /**
     * Dirty checking: dalam transaksi, entity yang di-load itu "managed".
     * Ubah field-nya saja -> Hibernate otomatis UPDATE saat commit, tanpa panggil save().
     */
    @Transactional
    public void rename(long id, String newName) {
        repository.findById(id).orElseThrow().rename(newName);
    }
}
