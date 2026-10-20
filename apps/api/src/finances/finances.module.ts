import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancesController],
  providers: [FinancesService, ClerkAuthGuard],
  exports: [FinancesService],
})
export class FinancesModule {}
