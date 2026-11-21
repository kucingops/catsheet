/**
 * 01 - ENCAPSULATION
 *
 * Inti: state internal disembunyikan, perubahan hanya lewat method yang menjaga aturan (invariant).
 *
 * Di JS/TS ada DUA cara bikin field private:
 *   - `#balance`        -> private BENERAN di runtime (hard private, ES2022). Nggak bisa diakses dari luar sama sekali.
 *   - `private balance` -> cuma dicek compiler TypeScript. Setelah jadi JS, `obj['balance']` tetap kebaca.
 * Kalau di Java, `private` itu dijaga JVM. Padanannya di JS adalah `#field`, bukan keyword `private`.
 */

export class InsufficientFundsError extends Error {
  override readonly name = 'InsufficientFundsError';
}

export class BankAccount {
  // hard private: nggak ada di Object.keys, JSON.stringify, atau akses bracket.
  #balance: number;
  readonly #history: string[] = [];

  // `readonly` = mirip `final` di Java (cuma bisa di-assign sekali, di constructor).
  readonly owner: string;

  // constructor dibuat private-ish lewat konvensi: pakai static factory `open()`
  // supaya validasi terkumpul di satu tempat (mirip `static of()` di Java).
  private constructor(owner: string, initialDeposit: number) {
    this.owner = owner;
    this.#balance = initialDeposit;
  }

  static open(owner: string, initialDeposit = 0): BankAccount {
    if (!owner.trim()) throw new Error('owner wajib diisi');
    if (initialDeposit < 0) throw new Error('setoran awal tidak boleh negatif');
    return new BankAccount(owner, initialDeposit);
  }

  // getter: dibaca seperti property (`acc.balance`), tapi tanpa setter -> read-only dari luar.
  get balance(): number {
    return this.#balance;
  }

  // Kembalikan COPY, bukan referensi array asli. Kalau array asli yang dibalikin,
  // caller bisa `.push()` dan merusak encapsulation (defensive copy, sama kayak di Java).
  get history(): readonly string[] {
    return [...this.#history];
  }

  deposit(amount: number): void {
    this.#assertPositive(amount);
    this.#balance += amount;
    this.#history.push(`deposit:${amount}`);
  }

  withdraw(amount: number): void {
    this.#assertPositive(amount);
    if (amount > this.#balance) {
      throw new InsufficientFundsError(`saldo ${this.#balance}, mau tarik ${amount}`);
    }
    this.#balance -= amount;
    this.#history.push(`withdraw:${amount}`);
  }

  // private method juga bisa pakai `#`.
  #assertPositive(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('nominal harus angka positif');
    }
  }

  // `#x in obj` = brand check: cara aman cek "apakah obj instance asli kelas ini".
  static isAccount(value: unknown): value is BankAccount {
    return typeof value === 'object' && value !== null && #balance in value;
  }

  // Tanpa ini JSON.stringify(acc) cuma menghasilkan {"owner":"..."} karena #field tidak ikut.
  toJSON() {
    return { owner: this.owner, balance: this.#balance };
  }
}

/** Contoh `private` versi TypeScript: aman saat compile, bocor saat runtime. */
export class SoftPrivate {
  private secret = 'bukan rahasia beneran';
  reveal(): string {
    return this.secret;
  }
}
