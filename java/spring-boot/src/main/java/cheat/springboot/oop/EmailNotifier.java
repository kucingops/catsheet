package cheat.springboot.oop;

import org.springframework.stereotype.Component;

@Component
public class EmailNotifier extends AbstractNotifier {

    @Override
    public String channel() {
        return "email";
    }

    @Override
    protected String format(String message) {
        return "[Catsheet] " + message;
    }

    @Override
    protected void deliver(String to, String formatted) {
        // di dunia nyata: JavaMailSender. Di sini cukup disimpan di history (lihat AbstractNotifier).
    }
}
