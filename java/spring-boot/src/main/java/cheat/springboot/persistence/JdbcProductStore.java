package cheat.springboot.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * Persistence TANPA JPA: SQL ditulis sendiri lewat JdbcClient (API fluent sejak Spring 6.1).
 * Plus: kontrol penuh atas SQL, tidak ada magic (lazy loading, dirty checking, N+1 tersembunyi).
 * Minus: mapping & query manual.
 */
@Repository
@ConditionalOnProperty(name = "catsheet.store", havingValue = "jdbc")
public class JdbcProductStore implements ProductStore {

    private final JdbcClient jdbc;

    public JdbcProductStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Product save(Product product) {
        if (product.id() != null) {
            jdbc.sql("UPDATE product SET name = :name, price = :price WHERE id = :id")
                    .paramSource(product) // ambil parameter dari accessor record
                    .update();
            return product;
        }
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql("INSERT INTO product (name, price) VALUES (:name, :price)")
                .param("name", product.name())
                .param("price", product.price())
                .update(keys, "id");
        return product.withId(keys.getKeyAs(Long.class));
    }

    @Override
    public Optional<Product> findById(long id) {
        return jdbc.sql("SELECT id, name, price FROM product WHERE id = ?")
                .param(id)
                .query(Product.class) // auto-map kolom ke komponen record
                .optional();
    }

    @Override
    public List<Product> findAll() {
        return jdbc.sql("SELECT id, name, price FROM product ORDER BY id").query(Product.class).list();
    }

    @Override
    public boolean deleteById(long id) {
        return jdbc.sql("DELETE FROM product WHERE id = ?").param(id).update() > 0;
    }
}
