import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [BenefitsController],
  providers: [BenefitsService, ClerkAuthGuard],
  exports: [BenefitsService],
})
export class BenefitsModule {}
