package cheat.springboot.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;

/** Slice test JPA: entity, repository, H2. Tiap test dibungkus transaksi yang di-rollback. */
@DataJpaTest
@Import(JpaProductStore.class)
class JpaProductStoreTest {

    @Autowired
    private JpaProductStore store;

    @Autowired
    private ProductJpaRepository repository;

    @Autowired
    private TestEntityManager em;

    @Test
    void derivedAndJpqlQueries() {
        store.save(new Product(null, "Kopi Susu", new BigDecimal("20000")));
        store.save(new Product(null, "Kopi Hitam", new BigDecimal("15000")));
        store.save(new Product(null, "Teh", new BigDecimal("8000")));

        assertThat(repository.findByPriceLessThanOrderByPriceAsc(new BigDecimal("16000")))
                .extracting(e -> e.toDomain().name())
                .containsExactly("Teh", "Kopi Hitam");
        assertThat(repository.search("kopi")).hasSize(2);
    }

    @Test
    void dirtyCheckingUpdatesWithoutSave() {
        Product saved = store.save(new Product(null, "Lama", BigDecimal.TEN));

        store.rename(saved.id(), "Baru");
        em.flush(); // paksa Hibernate kirim UPDATE
        em.clear(); // buang cache level-1 supaya benar-benar baca ulang dari DB

        assertThat(store.findById(saved.id())).hasValueSatisfying(p -> assertThat(p.name()).isEqualTo("Baru"));
    }
}
