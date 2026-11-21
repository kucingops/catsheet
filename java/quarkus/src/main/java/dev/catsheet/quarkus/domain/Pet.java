package dev.catsheet.quarkus.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.util.Objects;
import java.util.Optional;

/**
 * Aggregate root domain: hewan di shelter.
 *
 * <h2>4 pilar OOP di class ini</h2>
 * <ul>
 *   <li><b>Encapsulation</b>: semua field private, tidak ada setter. Status hanya bisa
 *       berubah lewat {@link #adopt(String)} yang menjaga aturan bisnis
 *       ("tidak bisa diadopsi dua kali").</li>
 *   <li><b>Abstraction</b>: class ini {@code abstract}. Kode lain cukup tahu "Pet punya biaya
 *       dasar dan suara", tanpa peduli detail Cat/Dog.</li>
 *   <li><b>Inheritance</b>: {@link Cat} dan {@link Dog} mewarisi state + perilaku umum.</li>
 *   <li><b>Polymorphism</b>: {@link #baseAdoptionFee()} dan {@link #sound()} dipanggil lewat
 *       tipe {@code Pet}, tapi yang jalan implementasi subclass-nya (dynamic dispatch).</li>
 * </ul>
 *
 * <p>{@code sealed ... permits Cat, Dog}: hierarchy-nya tertutup. Compiler tahu subclass-nya
 * cuma dua, jadi {@code switch} pattern matching atas Pet tidak butuh {@code default}
 * dan akan error compile kalau nanti ada subclass baru yang belum di-handle.</p>
 *
 * <p>Domain ini <b>tidak tahu apa-apa soal JPA, JSON, atau Quarkus</b>. Mapping ke database
 * ada di package {@code repository.jpa}. Hasilnya: domain bisa di-unit-test tanpa
 * container, tanpa database.</p>
 */
public abstract sealed class Pet permits Cat, Dog {

    private final PetId id;
    private final String name;
    private final LocalDate birthDate;
    private AdoptionStatus status;
    private String adopter;

    /**
     * Constructor protected: hanya subclass yang boleh memanggil.
     *
     * @param adopter {@code null} kalau belum diadopsi. Dipakai saat
     *                me-rekonstruksi object dari storage.
     */
    protected Pet(PetId id, String name, LocalDate birthDate, String adopter) {
        this.id = Objects.requireNonNull(id, "id");
        this.name = requireText(name, "name");
        this.birthDate = Objects.requireNonNull(birthDate, "birthDate");
        this.adopter = adopter;
        this.status = adopter == null ? AdoptionStatus.AVAILABLE : AdoptionStatus.ADOPTED;
    }

    // ---------- polymorphic behaviour (wajib diisi subclass) ----------

    /** Biaya adopsi sebelum diskon. Tiap jenis hewan punya aturan sendiri. */
    public abstract Money baseAdoptionFee();

    public abstract String sound();

    /** Nama spesies, dipakai buat discriminator di DB dan response API. */
    public abstract String species();

    /**
     * Hook method (Template Method pattern): default umur senior 8 tahun,
     * subclass boleh override. {@link #isSenior(Clock)} tetap {@code final}.
     */
    protected int seniorAgeInYears() {
        return 8;
    }

    // ---------- perilaku umum ----------

    public final int ageInYears(Clock clock) {
        return Period.between(birthDate, LocalDate.now(clock)).getYears();
    }

    public final boolean isSenior(Clock clock) {
        return ageInYears(clock) >= seniorAgeInYears();
    }

    /**
     * Satu-satunya cara mengubah status. Invariant dijaga di sini, bukan di service,
     * jadi siapapun yang pegang object Pet tidak bisa bikin state yang tidak valid.
     */
    public final void adopt(String adopterName) {
        if (status == AdoptionStatus.ADOPTED) {
            throw new PetAlreadyAdoptedException(id);
        }
        this.adopter = requireText(adopterName, "adopterName");
        this.status = AdoptionStatus.ADOPTED;
    }

    public final boolean isAvailable() {
        return status == AdoptionStatus.AVAILABLE;
    }

    // ---------- accessor (read-only) ----------

    public PetId id() {
        return id;
    }

    public String name() {
        return name;
    }

    public LocalDate birthDate() {
        return birthDate;
    }

    public AdoptionStatus status() {
        return status;
    }

    public Optional<String> adopter() {
        return Optional.ofNullable(adopter);
    }

    // ---------- identity ----------

    /** Entity dibandingkan berdasarkan identitas (id), bukan isi field. Beda dengan value object. */
    @Override
    public final boolean equals(Object o) {
        return o instanceof Pet other && id.equals(other.id);
    }

    @Override
    public final int hashCode() {
        return id.hashCode();
    }

    @Override
    public String toString() {
        return "%s[id=%s, name=%s, status=%s]".formatted(getClass().getSimpleName(), id, name, status);
    }

    protected static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " wajib diisi");
        }
        return value.strip();
    }
}
