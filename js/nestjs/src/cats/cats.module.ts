import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';

// CatRepository tidak didaftarkan di sini: disediakan oleh PersistenceModule (global).
// CatsModule tidak tahu & tidak peduli data disimpan di mana.
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
