package cheat.springboot.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class InMemoryProductStoreTest {

    private final ProductStore store = new InMemoryProductStore();

    @Test
    void crud() {
        Product saved = store.save(new Product(null, "Kopi", new BigDecimal("25000")));

        assertThat(saved.id()).isEqualTo(1L);
        assertThat(store.findById(1)).contains(saved);
        assertThat(store.deleteById(1)).isTrue();
        assertThat(store.findAll()).isEmpty();
    }
}
