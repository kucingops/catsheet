package cheat.springboot.persistence;

import java.util.List;
import java.util.Optional;

/**
 * Port / abstraksi penyimpanan. Service cuma kenal interface ini,
 * implementasinya dipilih lewat property catsheet.store = memory | jdbc | jpa.
 */
public interface ProductStore {

    Product save(Product product);

    Optional<Product> findById(long id);

    List<Product> findAll();

    boolean deleteById(long id);
}
