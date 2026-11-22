package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/kucingops/catsheet/go/gin/internal/auth"
	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/service"
)

// Handler sengaja tipis: parse request -> panggil service -> tulis response.
// Aturan bisnis (validasi, ownership) ada di service/domain, bukan di sini.
type noteHandler struct {
	svc *service.NoteService
}

func actor(c *gin.Context) domain.Actor {
	p, _ := auth.PrincipalFrom(c) // dijamin ada karena route ini di belakang Authenticate
	return p.Actor()
}

func (h *noteHandler) list(c *gin.Context) {
	notes, err := h.svc.List(c.Request.Context(), actor(c))
	if err != nil {
		writeError(c, err)
		return
	}
	if notes == nil {
		notes = []domain.Note{} // supaya JSON-nya [] bukan null
	}
	c.JSON(http.StatusOK, notes)
}

func (h *noteHandler) create(c *gin.Context) {
	var in service.NoteInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body JSON tidak valid"})
		return
	}
	n, err := h.svc.Create(c.Request.Context(), actor(c), in)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, n)
}

func (h *noteHandler) get(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	n, err := h.svc.Get(c.Request.Context(), actor(c), id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *noteHandler) update(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var in service.NoteInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body JSON tidak valid"})
		return
	}
	n, err := h.svc.Update(c.Request.Context(), actor(c), id, in)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *noteHandler) delete(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), actor(c), id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *noteHandler) stats(c *gin.Context) {
	st, err := h.svc.Stats(c.Request.Context(), actor(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, st)
}

func pathID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id harus angka positif"})
		return 0, false
	}
	return id, true
}

// writeError menerjemahkan error domain ke HTTP status di SATU tempat.
// Padanan @RestControllerAdvice. errors.Is menembus wrapping, jadi
// fmt.Errorf("note 5: %w", domain.ErrNotFound) tetap dikenali.
func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "tidak ditemukan"})
	case errors.Is(err, domain.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "tidak punya akses"})
	default:
		// Jangan bocorkan detail error internal (nama tabel, query) ke client.
		slog.ErrorContext(c.Request.Context(), "unhandled error", "err", err, "path", c.FullPath())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
	}
}
