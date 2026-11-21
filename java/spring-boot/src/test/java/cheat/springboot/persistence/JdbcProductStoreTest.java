package cheat.springboot.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/** Slice test: cuma load DataSource + JdbcClient + schema.sql, bukan seluruh aplikasi. Rollback tiap test. */
@JdbcTest
@Import(JdbcProductStore.class)
@TestPropertySource(properties = "catsheet.store=jdbc")
class JdbcProductStoreTest {

    @Autowired
    private JdbcProductStore store;

    @Test
    void insertUpdateAndQuery() {
        Product saved = store.save(new Product(null, "Teh", new BigDecimal("8000")));
        store.save(new Product(saved.id(), "Teh Manis", new BigDecimal("9000")));

        assertThat(store.findById(saved.id()))
                .hasValueSatisfying(p -> {
                    assertThat(p.name()).isEqualTo("Teh Manis");
                    assertThat(p.price()).isEqualByComparingTo("9000");
                });
        assertThat(store.findAll()).hasSize(1);
    }
}
