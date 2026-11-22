package idiomatic

import (
	"fmt"
	"io"
	"strings"
)

// Aturan praktis Go: "Accept interfaces, return structs."
//
//   - Interface didefinisikan di package yang MEMAKAI, bukan yang
//     mengimplementasi. Implementasinya tidak perlu tahu interface itu ada.
//   - Interface kecil, sering cuma satu method (io.Reader, io.Writer,
//     fmt.Stringer, error).
//   - Tidak ada `implements`: punya method yang cocok = memenuhi interface.
//
// Bandingkan dengan Java, yang biasanya bikin `UserRepository` interface
// di samping `UserRepositoryImpl` padahal implementasinya cuma satu.

// UserStore adalah struct konkret. Tidak ada interface di sampingnya.
type UserStore struct {
	emails map[string]string
}

func NewUserStore(emails map[string]string) *UserStore {
	return &UserStore{emails: emails}
}

func (s *UserStore) Email(user string) (string, bool) {
	e, ok := s.emails[user]
	return e, ok
}

func (s *UserStore) Delete(user string) { delete(s.emails, user) }

// emailLookup didefinisikan oleh pemakainya (Notifier), berisi HANYA method
// yang Notifier butuhkan. *UserStore otomatis memenuhinya, begitu juga fake
// di test, tanpa framework mock.
type emailLookup interface {
	Email(user string) (string, bool)
}

// Notifier menulis notifikasi ke io.Writer apa saja: os.Stdout, file,
// koneksi jaringan, bytes.Buffer di test.
type Notifier struct {
	users emailLookup
	out   io.Writer
}

func NewNotifier(users emailLookup, out io.Writer) *Notifier {
	return &Notifier{users: users, out: out}
}

func (n *Notifier) Notify(user, msg string) error {
	email, ok := n.users.Email(user)
	if !ok {
		return fmt.Errorf("notify %s: %w", user, ErrNotFound)
	}
	_, err := fmt.Fprintf(n.out, "to=%s msg=%s\n", email, msg)
	return err
}

// Compile-time check: build gagal kalau *UserStore berhenti memenuhi
// emailLookup. Ini cara Go untuk "implements" yang eksplisit, kalau perlu.
var _ emailLookup = (*UserStore)(nil)

// ---- Interface kecil bisa dikomposisi ----

// CountWords menerima io.Reader, jadi bisa dipakai untuk string, file,
// HTTP body, gzip stream, dan seterusnya.
func CountWords(r io.Reader) (int, error) {
	b, err := io.ReadAll(r)
	if err != nil {
		return 0, err
	}
	return len(strings.Fields(string(b))), nil
}

// ---- Type switch: padanan instanceof + pattern matching ----

func Describe(v any) string {
	switch x := v.(type) {
	case nil:
		return "nil"
	case int:
		return fmt.Sprintf("int %d", x)
	case fmt.Stringer:
		return "stringer " + x.String()
	case error:
		return "error " + x.Error()
	default:
		return fmt.Sprintf("lainnya %T", x)
	}
}
