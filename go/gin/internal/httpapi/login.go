package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/kucingops/catsheet/go/gin/internal/auth"
)

type loginHandler struct {
	deps Deps
}

// Binding Gin: tag `form`/`json` untuk mapping, `binding` untuk validasi
// (pakai go-playground/validator, mirip Bean Validation @NotBlank).
type credentials struct {
	Username string `form:"username" json:"username" binding:"required"`
	Password string `form:"password" json:"password" binding:"required"`
}

// sessionLogin: form login. Terima application/x-www-form-urlencoded.
func (h *loginHandler) sessionLogin(c *gin.Context) {
	var in credentials
	if err := c.ShouldBind(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username dan password wajib"})
		return
	}
	u, err := h.deps.Passwords.Check(c.Request.Context(), in.Username, in.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "username atau password salah"})
		return
	}
	// Bikin session ID BARU setiap login (mencegah session fixation).
	id := h.deps.Sessions.Create(auth.Principal{Username: u.Username, Roles: u.Roles})
	http.SetCookie(c.Writer, auth.NewSessionCookie(id, h.deps.Sessions.TTL(), h.deps.SecureCookie))
	c.JSON(http.StatusOK, gin.H{"message": "login sukses", "username": u.Username})
}

func (h *loginHandler) sessionLogout(c *gin.Context) {
	if ck, err := c.Request.Cookie(auth.SessionCookie); err == nil {
		h.deps.Sessions.Delete(ck.Value)
	}
	http.SetCookie(c.Writer, auth.NewSessionCookie("", -1, h.deps.SecureCookie)) // MaxAge<0 = hapus cookie
	c.Status(http.StatusNoContent)
}

// jwtToken: tukar username+password (JSON) dengan access token.
func (h *loginHandler) jwtToken(c *gin.Context) {
	var in credentials
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username dan password wajib"})
		return
	}
	u, err := h.deps.Passwords.Check(c.Request.Context(), in.Username, in.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "username atau password salah"})
		return
	}
	token, err := h.deps.JWT.Issue(auth.Principal{Username: u.Username, Roles: u.Roles})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"accessToken": token,
		"tokenType":   "Bearer",
		"expiresIn":   int(h.deps.JWT.TTL().Seconds()),
	})
}
