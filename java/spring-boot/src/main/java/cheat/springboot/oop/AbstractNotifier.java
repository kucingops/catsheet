package cheat.springboot.oop;

import java.util.ArrayList;
import java.util.List;

/**
 * INHERITANCE + TEMPLATE METHOD: alur umum (validasi -> format -> deliver) dikunci di sini (final),
 * subclass cuma override langkah yang beda. Abstract class boleh punya state & implementasi,
 * interface (umumnya) cuma kontrak.
 */
public abstract class AbstractNotifier implements Notifier {

    private final List<String> sent = new ArrayList<>();

    @Override
    public final void send(String to, String message) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("penerima kosong");
        }
        String formatted = format(message);
        deliver(to, formatted);
        sent.add(to + ": " + formatted);
    }

    /** Hook dengan default, boleh di-override. */
    protected String format(String message) {
        return message;
    }

    /** Wajib diimplementasi subclass. */
    protected abstract void deliver(String to, String formatted);

    public List<String> sent() {
        return List.copyOf(sent);
    }
}
