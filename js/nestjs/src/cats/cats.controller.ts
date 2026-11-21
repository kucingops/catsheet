import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Auth, CurrentUser, Roles } from '../auth/decorators.js';
import type { Principal } from '../auth/principal.js';
import { type CatStats, CatsService } from './cats.service.js';
import type { Cat } from './domain/cat.js';
import { CreateCatDto } from './dto/create-cat.dto.js';

/**
 * Controller tipis: terima HTTP, delegasi ke service, return hasil.
 * Matriks akses (lihat README):
 *   GET    /cats              publik
 *   GET    /cats/stats        hanya API key (mesin)        -> @Auth('api-key')
 *   GET    /cats/:id          publik
 *   POST   /cats              login jalur apa saja         -> @Auth()
 *   POST   /cats/:id/adopt    hanya manusia: session / JWT -> @Auth('session', 'jwt')
 *   DELETE /cats/:id          role admin                   -> @Roles('admin')
 */
@Controller('cats')
export class CatsController {
  constructor(private readonly cats: CatsService) {}

  @Get()
  findAll(): Promise<Cat[]> {
    return this.cats.findAll();
  }

  // Didefinisikan SEBELUM ':id' supaya '/cats/stats' tidak ketangkap sebagai id.
  @Get('stats')
  @Auth('api-key')
  stats(): Promise<CatStats> {
    return this.cats.stats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Cat> {
    return this.cats.findOne(id);
  }

  @Post()
  @Auth()
  create(@Body() dto: CreateCatDto): Promise<Cat> {
    return this.cats.register(dto);
  }

  @Post(':id/adopt')
  @HttpCode(200)
  @Auth('session', 'jwt')
  adopt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal): Promise<Cat> {
    return this.cats.adopt(id, user.username);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.cats.remove(id);
  }
}
