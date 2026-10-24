import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BenefitsService } from './benefits.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [BenefitsService],
  exports: [BenefitsService],
})
export class BenefitsModule {}
