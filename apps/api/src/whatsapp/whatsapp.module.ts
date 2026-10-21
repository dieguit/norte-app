import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  WHATSAPP_ADAPTER,
  whatsappAdapterProvider,
} from './whatsapp.adapter.provider';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappLinksService } from './whatsapp-links.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WhatsappController],
  providers: [whatsappAdapterProvider, WhatsappLinksService, ClerkAuthGuard],
  exports: [WHATSAPP_ADAPTER, WhatsappLinksService],
})
export class WhatsappModule {}
