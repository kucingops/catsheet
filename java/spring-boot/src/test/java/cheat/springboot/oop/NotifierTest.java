package cheat.springboot.oop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class NotifierTest {

    @Test
    void subclassesOverrideOnlyTheStepThatDiffers() {
        EmailNotifier email = new EmailNotifier();
        email.send("a@b.c", "halo");
        assertThat(email.sent()).containsExactly("a@b.c: [Catsheet] halo");

        SmsNotifier sms = new SmsNotifier();
        sms.send("0812", "x".repeat(200));
        assertThat(sms.sent().getFirst()).hasSize("0812: ".length() + SmsNotifier.MAX_LENGTH);
    }

    @Test
    void templateMethodValidationAppliesToAllSubclasses() {
        assertThatThrownBy(() -> new SmsNotifier().send(" ", "halo")).isInstanceOf(IllegalArgumentException.class);
    }
}
