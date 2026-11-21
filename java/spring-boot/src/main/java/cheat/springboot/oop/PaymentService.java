package cheat.springboot.oop;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

/**
 * COMPOSITION over inheritance + DEPENDENCY INVERSION:
 * service bergantung pada abstraksi (Notifier), bukan EmailNotifier/SmsNotifier langsung.
 * Spring inject SEMUA bean Notifier sebagai List -> nambah channel baru tidak perlu ubah class ini (Open/Closed).
 */
@Service
public class PaymentService {

    private final FeeCalculator feeCalculator = new FeeCalculator();
    private final Map<String, Notifier> notifiers;

    public PaymentService(List<Notifier> notifiers) { // constructor injection: field final, gampang di-unit-test
        this.notifiers = notifiers.stream().collect(Collectors.toMap(Notifier::channel, Function.identity()));
    }

    public Money pay(BankAccount from, Payment payment, String channel, String to) {
        Money fee = feeCalculator.feeFor(payment);
        Money total = payment.amount().plus(fee);
        from.withdraw(total);

        Notifier notifier = notifiers.get(channel);
        if (notifier == null) {
            throw new IllegalArgumentException("channel tidak dikenal: " + channel);
        }
        notifier.send(to, "Pembayaran " + total.amount() + " " + total.currency() + " berhasil");
        return total;
    }
}
