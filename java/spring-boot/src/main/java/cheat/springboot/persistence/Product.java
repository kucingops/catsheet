package cheat.springboot.persistence;

import java.math.BigDecimal;

/** Domain model: bebas dari anotasi JPA, jadi bisa dipakai oleh semua implementasi store. */
public record Product(Long id, String name, BigDecimal price) {

    public Product withId(Long newId) {
        return new Product(newId, name, price);
    }
}
