package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/kucingops/catsheet/go/gin/internal/domain"

	_ "modernc.org/sqlite" // blank import: cuma jalanin init() yang mendaftarkan driver "sqlite"
)

// SQLNoteRepository pakai database/sql dari standard library.
//
// Perbandingan dengan Java:
//   - database/sql  ~ JDBC + connection pool (sql.DB itu POOL, bukan satu koneksi)
//   - tidak ada ORM bawaan. Pilihan populer: sqlc (generate kode dari SQL),
//     sqlx (helper scan ke struct), GORM (ORM mirip Hibernate), ent.
//   - di sini sengaja SQL mentah supaya kelihatan apa yang terjadi, mirip
//     JdbcTemplate.
//
// Driver: modernc.org/sqlite itu SQLite versi pure Go (tanpa CGO), jadi
// `go build` jalan di mana saja. Ganti ke Postgres cukup ganti driver
// (github.com/jackc/pgx/v5/stdlib) dan placeholder ? jadi $1.
type SQLNoteRepository struct {
	db *sql.DB
}

var _ NoteRepository = (*SQLNoteRepository)(nil)

// OpenSQLite membuka DB dan menjalankan migrasi. dsn contoh: "file:notes.db".
func OpenSQLite(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// SQLite cuma boleh satu writer. Untuk Postgres/MySQL, atur pool lebih besar:
	// SetMaxOpenConns, SetMaxIdleConns, SetConnMaxLifetime (mirip setting HikariCP).
	db.SetMaxOpenConns(1)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}
	if err := migrate(ctx, db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

// migrate versi minimal. Di proyek beneran pakai golang-migrate, goose, atau
// atlas (padanan Flyway/Liquibase).
func migrate(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS notes (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			owner      TEXT    NOT NULL,
			title      TEXT    NOT NULL,
			body       TEXT    NOT NULL DEFAULT '',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner);`)
	return err
}

func NewSQLNoteRepository(db *sql.DB) *SQLNoteRepository { return &SQLNoteRepository{db: db} }

func (r *SQLNoteRepository) Create(ctx context.Context, n domain.Note) (domain.Note, error) {
	// Selalu pakai placeholder (?), JANGAN fmt.Sprintf ke query -> SQL injection.
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO notes (owner, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		n.Owner, n.Title, n.Body, n.CreatedAt.UnixNano(), n.UpdatedAt.UnixNano())
	if err != nil {
		return domain.Note{}, fmt.Errorf("insert note: %w", err)
	}
	n.ID, err = res.LastInsertId()
	return n, err
}

const selectCols = `SELECT id, owner, title, body, created_at, updated_at FROM notes`

// rowScanner bisa *sql.Row atau *sql.Rows. Interface kecil yang didefinisikan
// di sisi pemakai: contoh nyata "accept interfaces".
type rowScanner interface {
	Scan(dest ...any) error
}

func scanNote(s rowScanner) (domain.Note, error) {
	var n domain.Note
	var created, updated int64
	if err := s.Scan(&n.ID, &n.Owner, &n.Title, &n.Body, &created, &updated); err != nil {
		return domain.Note{}, err
	}
	n.CreatedAt = time.Unix(0, created).UTC()
	n.UpdatedAt = time.Unix(0, updated).UTC()
	return n, nil
}

func (r *SQLNoteRepository) FindByID(ctx context.Context, id int64) (domain.Note, error) {
	n, err := scanNote(r.db.QueryRowContext(ctx, selectCols+` WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		// Terjemahkan error infrastruktur ke error domain, supaya service
		// tidak perlu tahu soal database/sql.
		return domain.Note{}, fmt.Errorf("note %d: %w", id, domain.ErrNotFound)
	}
	return n, err
}

func (r *SQLNoteRepository) query(ctx context.Context, q string, args ...any) ([]domain.Note, error) {
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // WAJIB, kalau lupa koneksi bocor dari pool
	var out []domain.Note
	for rows.Next() {
		n, err := scanNote(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err() // cek error yang terjadi selama iterasi
}

func (r *SQLNoteRepository) FindByOwner(ctx context.Context, owner string) ([]domain.Note, error) {
	return r.query(ctx, selectCols+` WHERE owner = ? ORDER BY id`, owner)
}

func (r *SQLNoteRepository) FindAll(ctx context.Context) ([]domain.Note, error) {
	return r.query(ctx, selectCols+` ORDER BY id`)
}

func (r *SQLNoteRepository) Update(ctx context.Context, n domain.Note) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?`,
		n.Title, n.Body, n.UpdatedAt.UnixNano(), n.ID)
	return mustAffectOne(res, err, n.ID)
}

func (r *SQLNoteRepository) Delete(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM notes WHERE id = ?`, id)
	return mustAffectOne(res, err, id)
}

func mustAffectOne(res sql.Result, err error, id int64) error {
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("note %d: %w", id, domain.ErrNotFound)
	}
	return nil
}

// TransferOwnership contoh TRANSAKSI. Padanan @Transactional di Spring, tapi
// eksplisit: Begin, kerjakan, Commit. Kalau ada error di tengah, Rollback.
// Pola `defer tx.Rollback()` aman: setelah Commit sukses, Rollback jadi no-op.
func (r *SQLNoteRepository) TransferOwnership(ctx context.Context, from, to string) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var exists int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM notes WHERE owner = ?`, from).Scan(&exists); err != nil {
		return 0, err
	}
	if exists == 0 {
		return 0, fmt.Errorf("owner %q tidak punya note: %w", from, domain.ErrNotFound)
	}
	res, err := tx.ExecContext(ctx, `UPDATE notes SET owner = ? WHERE owner = ?`, to, from)
	if err != nil {
		return 0, err
	}
	moved, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	return moved, tx.Commit()
}
