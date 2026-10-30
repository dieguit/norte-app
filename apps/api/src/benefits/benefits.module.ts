import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';
import { BenefitsIngestCron } from './benefits-ingest.cron';
import { BenefitsExplorerController } from './ingest/explorer.controller';
import { BenefitsExplorerService } from './ingest/explorer.service';
import {
  BenefitsAdminGuard,
  benefitsAdminClerkProvider,
} from './benefits-admin.guard';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [BenefitsController, BenefitsExplorerController],
  providers: [
    BenefitsIngestCron,
    BenefitsService,
    BenefitsExplorerService,
    ClerkAuthGuard,
    BenefitsAdminGuard,
    benefitsAdminClerkProvider,
  ],
  exports: [BenefitsService],
})
export class BenefitsModule {}
