package cheat.springboot.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

/**
 * TANPA persistence: data hilang saat aplikasi restart.
 * Cocok untuk cache, prototype, atau fake di unit test.
 * Bean Spring itu singleton dan diakses banyak thread -> pakai ConcurrentHashMap + AtomicLong.
 */
@Repository
@ConditionalOnProperty(name = "catsheet.store", havingValue = "memory")
public class InMemoryProductStore implements ProductStore {

    private final Map<Long, Product> data = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();

    @Override
    public Product save(Product product) {
        Product saved = product.id() == null ? product.withId(sequence.incrementAndGet()) : product;
        data.put(saved.id(), saved);
        return saved;
    }

    @Override
    public Optional<Product> findById(long id) {
        return Optional.ofNullable(data.get(id));
    }

    @Override
    public List<Product> findAll() {
        return new ArrayList<>(data.values());
    }

    @Override
    public boolean deleteById(long id) {
        return data.remove(id) != null;
    }
}
