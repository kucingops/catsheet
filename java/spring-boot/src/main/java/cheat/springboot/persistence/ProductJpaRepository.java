package cheat.springboot.persistence;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Spring Data bikin implementasinya saat runtime (proxy). */
public interface ProductJpaRepository extends JpaRepository<ProductEntity, Long> {

    // derived query: SQL dibuat dari nama method
    List<ProductEntity> findByPriceLessThanOrderByPriceAsc(BigDecimal max);

    // JPQL: query ke entity, bukan ke tabel
    @Query("select p from ProductEntity p where lower(p.name) like lower(concat('%', :keyword, '%'))")
    List<ProductEntity> search(String keyword);
}
