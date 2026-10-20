import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { FinancesModule } from '../finances/finances.module';
import { GoalsModule } from '../goals/goals.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [GoalsModule, FinancesModule],
  controllers: [HomeController],
  providers: [HomeService, ClerkAuthGuard],
  exports: [HomeService],
})
export class HomeModule {}
