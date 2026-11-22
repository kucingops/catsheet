package auth

import "net/http"

// BasicAuth: header `Authorization: Basic base64(user:pass)` di SETIAP request.
// Stateless dan simpel, cocok untuk tool internal / testing. Wajib HTTPS
// karena base64 itu encoding, bukan enkripsi.
type BasicAuth struct {
	Checker *PasswordChecker
}

func (BasicAuth) Name() string { return "basic" }

func (b BasicAuth) Authenticate(r *http.Request) (Principal, error) {
	username, password, ok := r.BasicAuth()
	if !ok {
		return Principal{}, ErrNoCredentials
	}
	u, err := b.Checker.Check(r.Context(), username, password)
	if err != nil {
		return Principal{}, err
	}
	return Principal{Username: u.Username, Roles: u.Roles, Method: "basic"}, nil
}
