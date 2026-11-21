import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AUTH_STRATEGIES, AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { ApiKeyStrategy } from './strategies/api-key.strategy.js';
import { BasicStrategy } from './strategies/basic.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { SessionStrategy } from './strategies/session.strategy.js';
import { PasswordHasher, ScryptPasswordHasher } from './users/password-hasher.js';
import { UserStore } from './users/user.store.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'dev-only-secret-ganti-di-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
    UserStore,
    AuthService,
    SessionStrategy,
    JwtStrategy,
    BasicStrategy,
    ApiKeyStrategy,
    {
      // Kumpulkan semua strategi jadi satu array. Urutan = prioritas pengecekan.
      provide: AUTH_STRATEGIES,
      inject: [SessionStrategy, JwtStrategy, BasicStrategy, ApiKeyStrategy],
      useFactory: (...strategies: unknown[]) => strategies,
    },
    // Guard global: berlaku ke semua controller. Route tanpa @Auth/@Roles tetap publik.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
