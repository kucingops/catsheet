package cheat.springboot.persistence;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Entity JPA: class biasa (bukan record) karena Hibernate butuh no-arg constructor
 * dan object yang mutable untuk dirty checking.
 */
@Entity
@Table(name = "product")
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    protected ProductEntity() {
        // untuk JPA
    }

    static ProductEntity from(Product p) {
        ProductEntity e = new ProductEntity();
        e.id = p.id();
        e.name = p.name();
        e.price = p.price();
        return e;
    }

    Product toDomain() {
        return new Product(id, name, price);
    }

    void rename(String newName) {
        this.name = newName;
    }
}
