import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { IncomesModule } from '../incomes/incomes.module';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { FinancialOnboardingController } from './financial-onboarding.controller';
import { FinancialOnboardingService } from './financial-onboarding.service';

@Module({
  imports: [DatabaseModule, IncomesModule, ExpensesModule],
  controllers: [FinancialOnboardingController],
  providers: [FinancialOnboardingService, ClerkAuthGuard],
})
export class FinancialOnboardingModule {}
