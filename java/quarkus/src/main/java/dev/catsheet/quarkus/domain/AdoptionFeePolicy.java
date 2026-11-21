package dev.catsheet.quarkus.domain;

/**
 * Abstraction + Strategy pattern.
 *
 * <p>Service cuma tahu "ada cara menghitung biaya". Implementasinya bisa diganti
 * (promo 17 Agustus, gratis untuk shelter partner, dll.) tanpa mengubah service.
 * Ini Open/Closed Principle: open for extension, closed for modification.</p>
 *
 * <p>Karena cuma punya satu abstract method, interface ini juga functional interface,
 * jadi di unit test bisa diisi lambda: {@code pet -> Money.rupiah(1)}.</p>
 */
@FunctionalInterface
public interface AdoptionFeePolicy {

    Money feeFor(Pet pet);
}
