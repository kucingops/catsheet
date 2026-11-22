package dev.catsheet.quarkus.repository.jpa;

import dev.catsheet.quarkus.domain.AdoptionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.LocalDate;

/**
 * Representasi tabel {@code pet} di database. SENGAJA dipisah dari domain {@code Pet}.
 *
 * <h2>Inheritance di JPA</h2>
 * Ada 3 strategi, ini pertanyaan interview klasik:
 * <ul>
 *   <li><b>SINGLE_TABLE</b> (dipakai di sini): semua subclass di satu tabel, dibedakan kolom
 *       discriminator ({@code species}). Query paling cepat (tanpa join), tapi kolom khusus
 *       subclass harus nullable.</li>
 *   <li><b>JOINED</b>: tabel induk + tabel per subclass, di-join pakai PK. Normalized, tapi
 *       query polymorphic butuh join.</li>
 *   <li><b>TABLE_PER_CLASS</b>: satu tabel lengkap per subclass concrete. Query polymorphic
 *       pakai UNION, jarang dipakai.</li>
 * </ul>
 * Selain itu ada {@code @MappedSuperclass}: cuma berbagi mapping kolom, bukan entity, jadi tidak bisa
 * di-query secara polymorphic.
 *
 * <h2>Panache: repository vs active record</h2>
 * Di sini dipakai gaya <b>repository</b> ({@link PetEntityDao}). Gaya lain: <b>active record</b>,
 * entity extend {@code PanacheEntity} lalu panggil {@code PetEntity.findById(..)} secara static.
 * Active record TIDAK cocok untuk entity {@code abstract} seperti ini: method static-nya cuma
 * di-generate di entity concrete, jadi {@code PetEntity.findById} akan error saat runtime.
 * Field dibuat public biar ringkas; Hibernate tetap akses via field.
 */
@Entity
@Table(name = "pet")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "species")
public abstract class PetEntity {

    @Id
    @Column(length = 36)
    public String id;

    @Column(nullable = false, length = 50)
    public String name;

    @Column(name = "birth_date", nullable = false)
    public LocalDate birthDate;

    /** Simpan enum sebagai teks. Default-nya ORDINAL (angka), rawan rusak kalau urutan enum berubah. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public AdoptionStatus status;

    public String adopter;

    /**
     * Optimistic locking. Tiap update, Hibernate menambah versi dan menambahkan
     * {@code WHERE version = ?}. Kalau dua transaksi mengadopsi pet yang sama bersamaan,
     * yang kalah dapat {@code OptimisticLockException}, jadi tidak ada double adoption.
     */
    @Version
    public long version;
}
