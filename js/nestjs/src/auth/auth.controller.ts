import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service.js';
import { Auth, CurrentUser } from './decorators.js';
import type { Principal } from './principal.js';

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login SESSION: server bikin sesi, browser dapat cookie. */
  @Post('session/login')
  @HttpCode(200)
  async sessionLogin(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.auth.validateCredentials(dto.username, dto.password);
    if (!user) throw new UnauthorizedException('username atau password salah');
    // regenerate = ganti session id setelah login, mencegah SESSION FIXATION
    // (Spring Security melakukan ini otomatis lewat sessionFixation().changeSessionId()).
    await new Promise<void>((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
    req.session.userId = user.id;
    return { message: 'login session berhasil', username: user.username };
  }

  @Post('session/logout')
  @HttpCode(204)
  @Auth('session')
  async sessionLogout(@Req() req: Request): Promise<void> {
    await new Promise<void>((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));
  }

  /** Login JWT: tukar username/password dengan access token. Server tidak menyimpan apa pun. */
  @Post('jwt/login')
  @HttpCode(200)
  async jwtLogin(@Body() dto: LoginDto) {
    const user = await this.auth.validateCredentials(dto.username, dto.password);
    if (!user) throw new UnauthorizedException('username atau password salah');
    return { accessToken: await this.auth.issueToken(user), tokenType: 'Bearer', expiresIn: 900 };
  }

  /** Bisa diakses lewat jalur login mana pun; respons menunjukkan jalur yang dipakai. */
  @Get('me')
  @Auth()
  me(@CurrentUser() user: Principal): Principal {
    return user;
  }
}
