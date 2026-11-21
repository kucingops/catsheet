package cheat.springboot.oop;

/** Kontrak (interface): pemanggil cuma tahu "bisa kirim notifikasi", tidak peduli caranya. */
public interface Notifier {

    String channel();

    void send(String to, String message);
}
