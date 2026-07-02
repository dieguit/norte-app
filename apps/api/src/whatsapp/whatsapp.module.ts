import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WhatsappAuthStoreService } from './whatsapp-auth-store.service';
import { WhatsappConnectionService } from './whatsapp-connection.service';
import { WhatsappMessageService } from './whatsapp-message.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    WhatsappAuthStoreService,
    WhatsappConnectionService,
    WhatsappMessageService,
  ],
})
export class WhatsappModule {}
