// Package httpapi merakit route Gin. Satu resource (notes) dipasang di
// beberapa group, masing-masing dengan metode login berbeda. Ini padanan
// beberapa SecurityFilterChain dengan securityMatcher berbeda di Spring:
//
//	/api/basic/*    -> hanya HTTP Basic
//	/api/session/*  -> hanya cookie session (hasil form login)
//	/api/jwt/*      -> hanya Bearer JWT
//	/api/*          -> salah satu dari: JWT, session, Basic, API key
//	/api/admin/*    -> JWT atau API key, plus wajib role ADMIN
package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/kucingops/catsheet/go/gin/internal/auth"
	"github.com/kucingops/catsheet/go/gin/internal/domain"
	"github.com/kucingops/catsheet/go/gin/internal/service"
)

// Deps dikumpulkan dalam satu struct supaya NewRouter tidak punya 8 parameter.
// Ini "composition root" versi manual. Alternatif DI otomatis di Go: google/wire
// (generate kode saat compile) atau uber-go/fx (runtime, mirip Spring).
type Deps struct {
	Notes        *service.NoteService
	Passwords    *auth.PasswordChecker
	Sessions     *auth.SessionStore
	JWT          *auth.JWTIssuer
	APIKeys      *auth.APIKeyAuth
	SecureCookie bool
}

func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery()) // tangkap panic -> 500, server tidak mati
	if gin.Mode() == gin.DebugMode {
		// Middleware global harus di-Use SEBELUM route didaftarkan. Gin
		// menggabungkan handler saat registrasi, jadi Use setelahnya tidak
		// berlaku ke route yang sudah ada (jebakan umum).
		r.Use(gin.Logger())
	}

	basic := auth.BasicAuth{Checker: d.Passwords}
	session := auth.SessionAuth{Store: d.Sessions}
	jwtAuth := auth.JWTAuth{Issuer: d.JWT}

	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	lh := &loginHandler{deps: d}
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/session/login", lh.sessionLogin)
		authGroup.POST("/session/logout", lh.sessionLogout)
		authGroup.POST("/jwt/token", lh.jwtToken)
	}

	nh := &noteHandler{svc: d.Notes}
	mount := func(g *gin.RouterGroup) {
		g.GET("/me", me)
		g.GET("/notes", nh.list)
		g.POST("/notes", nh.create)
		g.GET("/notes/:id", nh.get)
		g.PUT("/notes/:id", nh.update)
		g.DELETE("/notes/:id", nh.delete)
	}

	mount(r.Group("/api/basic", auth.Authenticate(basic)))
	mount(r.Group("/api/session", auth.Authenticate(session)))
	mount(r.Group("/api/jwt", auth.Authenticate(jwtAuth)))

	admin := r.Group("/api/admin", auth.Authenticate(jwtAuth, d.APIKeys), auth.RequireRole(domain.RoleAdmin))
	admin.GET("/stats", nh.stats)

	// Paling umum dipasang terakhir. Gin pakai radix tree, jadi /api/admin
	// dan /api/basic tetap lebih spesifik daripada /api/notes.
	mount(r.Group("/api", auth.Authenticate(jwtAuth, session, basic, d.APIKeys)))

	return r
}

func me(c *gin.Context) {
	p, _ := auth.PrincipalFrom(c)
	c.JSON(http.StatusOK, p)
}
