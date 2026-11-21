import { type INestApplication, ValidationPipe } from '@nestjs/common';
import session from 'express-session';

/**
 * Setup yang dipakai bareng oleh main.ts dan e2e test, supaya test menguji konfigurasi yang SAMA dengan production.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.use(
    session({
      name: 'sid',
      secret: process.env.SESSION_SECRET ?? 'dev-only-session-secret',
      resave: false,
      saveUninitialized: false, // jangan bikin sesi untuk pengunjung yang belum login
      cookie: {
        httpOnly: true, // JS di browser nggak bisa baca cookie -> mitigasi XSS mencuri sesi
        sameSite: 'lax', // mitigasi CSRF dasar
        secure: process.env.NODE_ENV === 'production', // cookie cuma lewat HTTPS di production
        maxAge: 30 * 60 * 1000,
      },
      // store default = MemoryStore: hanya untuk dev. Production: connect-redis dsb.
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // buang property yang tidak ada di DTO
      forbidNonWhitelisted: true, // ...atau tolak sekalian (400)
      transform: true, // payload -> instance class DTO
    }),
  );
  app.enableShutdownHooks(); // supaya onModuleDestroy (tutup koneksi DB) jalan saat SIGTERM
  return app;
}
