package cheat.springboot.oop;

import org.springframework.stereotype.Component;

@Component
public class SmsNotifier extends AbstractNotifier {

    static final int MAX_LENGTH = 160;

    @Override
    public String channel() {
        return "sms";
    }

    @Override
    protected String format(String message) {
        return message.length() <= MAX_LENGTH ? message : message.substring(0, MAX_LENGTH - 3) + "...";
    }

    @Override
    protected void deliver(String to, String formatted) {
        // di dunia nyata: panggil SMS gateway.
    }
}
