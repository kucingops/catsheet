package dev.catsheet.quarkus.repository.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * DAO Panache untuk {@link PetEntity}. Cukup implement interface, semua method CRUD
 * ({@code findById}, {@code persist}, {@code list}, {@code count}, {@code deleteAll}, ...)
 * sudah tersedia. Padanan {@code JpaRepository} di Spring Data.
 *
 * <p>Query polymorphic: {@code listAll()} di sini mengembalikan CatEntity DAN DogEntity
 * sekaligus, Hibernate yang membaca kolom discriminator lalu bikin object subclass yang tepat.</p>
 */
@ApplicationScoped
public class PetEntityDao implements PanacheRepositoryBase<PetEntity, String> {
}
