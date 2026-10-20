import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { DatabaseModule } from '../database/database.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IncomesController],
  providers: [IncomesService, ClerkAuthGuard],
  exports: [IncomesService],
})
export class IncomesModule {}
