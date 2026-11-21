package cheat.springboot.persistence;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private final ProductStore store;

    public ProductService(ProductStore store) {
        this.store = store;
    }

    @Transactional
    public Product create(String name, BigDecimal price) {
        if (price.signum() <= 0) {
            throw new IllegalArgumentException("harga harus > 0");
        }
        return store.save(new Product(null, name.trim(), price));
    }

    public Product get(long id) {
        return store.findById(id).orElseThrow(() -> new NoSuchElementException("product " + id + " tidak ada"));
    }

    public List<Product> list() {
        return store.findAll();
    }
}
