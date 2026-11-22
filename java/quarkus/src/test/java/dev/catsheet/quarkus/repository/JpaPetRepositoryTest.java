package dev.catsheet.quarkus.repository;

import dev.catsheet.quarkus.repository.jpa.JpaPetRepository;
import dev.catsheet.quarkus.repository.jpa.PetEntityDao;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;

/**
 * Integration test JPA: Quarkus beneran start, Hibernate beneran bikin tabel di H2.
 *
 * <p>Kenapa tidak pakai {@code @TestTransaction} (rollback otomatis per test)? Karena kita
 * mau memastikan data benar-benar ter-commit dan dibaca ulang dari DB lewat transaksi baru,
 * bukan dari cache first-level Hibernate. Jadi tabel dibersihkan manual di {@code @BeforeEach}.</p>
 */
@QuarkusTest
class JpaPetRepositoryTest extends PetRepositoryContract {

    @Inject
    JpaPetRepository repository;

    @Inject
    PetEntityDao dao;

    @BeforeEach
    void cleanTable() {
        QuarkusTransaction.requiringNew().run(dao::deleteAll); // transaksi programmatic
    }

    @Override
    protected PetRepository repository() {
        return repository;
    }
}
