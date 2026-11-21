/**
 * 04 - ABSTRACTION
 *
 * Abstract class vs interface (pertanyaan klasik):
 *  - interface: cuma KONTRAK bentuk. Di TS hilang total setelah compile (nggak ada di runtime),
 *    jadi nggak bisa dipakai buat `instanceof` atau jadi token DI di NestJS.
 *  - abstract class: kontrak + implementasi bersama + state. Tetap ada di runtime
 *    (makanya NestJS sering pakai abstract class sebagai token DI, lihat js/nestjs).
 *  - Satu class bisa `implements` banyak interface, tapi `extends` cuma satu class (sama kayak Java).
 *
 * Contoh di bawah juga Template Method pattern: alur `pay()` dikunci di parent,
 * detail `charge()` diserahkan ke subclass.
 */

export interface Notifier {
  notify(message: string): void;
}

export interface PaymentResult {
  ok: boolean;
  reference: string;
  fee: number;
}

export abstract class PaymentProcessor {
  readonly #notifier: Notifier;

  constructor(notifier: Notifier) {
    this.#notifier = notifier;
  }

  /** Template method: urutan langkah tetap, subclass tidak override ini. */
  pay(amount: number): PaymentResult {
    if (amount <= 0) throw new RangeError('amount harus > 0');
    const fee = this.fee(amount);
    const reference = this.charge(amount + fee);
    this.#notifier.notify(`[${this.channel}] bayar ${amount} + fee ${fee}, ref ${reference}`);
    return { ok: true, reference, fee };
  }

  /** hook dengan default, boleh di-override. */
  protected fee(_amount: number): number {
    return 0;
  }

  /** wajib diimplementasi subclass. */
  protected abstract charge(total: number): string;
  abstract readonly channel: string;
}

export class BankTransferProcessor extends PaymentProcessor {
  readonly channel = 'bank-transfer';
  #seq = 0;
  protected override fee(): number {
    return 2_500;
  }
  protected charge(): string {
    return `BT-${++this.#seq}`;
  }
}

export class EWalletProcessor extends PaymentProcessor {
  readonly channel = 'e-wallet';
  protected override fee(amount: number): number {
    return Math.round(amount * 0.01);
  }
  protected charge(total: number): string {
    return `EW-${total}`;
  }
}

/** Implementasi Notifier yang menyimpan pesan (berguna juga sebagai test double). */
export class InMemoryNotifier implements Notifier {
  readonly messages: string[] = [];
  notify(message: string): void {
    this.messages.push(message);
  }
}
