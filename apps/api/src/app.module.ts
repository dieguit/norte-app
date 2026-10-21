import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { PlaceholderModule } from './placeholder/placeholder.module';
import { ProfileModule } from './profile/profile.module';
import { IncomesModule } from './incomes/incomes.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SavingsPlacesModule } from './savings-places/savings-places.module';
import { FinancesModule } from './finances/finances.module';
import { GoalsModule } from './goals/goals.module';
import { FinancialOnboardingModule } from './financial-onboarding/financial-onboarding.module';
import { ContributionsModule } from './contributions/contributions.module';
import { HomeModule } from './home/home.module';
import { MastraIntegrationModule } from './mastra/mastra.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    DatabaseModule,
    PlaceholderModule,
    ProfileModule,
    IncomesModule,
    ExpensesModule,
    SavingsPlacesModule,
    FinancesModule,
    GoalsModule,
    FinancialOnboardingModule,
    ContributionsModule,
    HomeModule,
    WhatsappModule,
    // Mastra registers a catch-all controller; must stay last so it doesn't shadow app routes.
    MastraIntegrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
