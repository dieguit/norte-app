import { Injectable, Logger } from '@nestjs/common';
import type { proto, WASocket } from '@whiskeysockets/baileys';

type ReplySocket = Pick<WASocket, 'sendMessage'>;

@Injectable()
export class WhatsappMessageService {
  private readonly logger = new Logger(WhatsappMessageService.name);

  async handleMessages(
    messages: proto.IWebMessageInfo[],
    socket: ReplySocket,
  ): Promise<void> {
    for (const message of messages) {
      await this.handleMessage(message, socket);
    }
  }

  private async handleMessage(
    message: proto.IWebMessageInfo,
    socket: ReplySocket,
  ): Promise<void> {
    const remoteJid = message.key?.remoteJid;

    if (!remoteJid) {
      this.logger.log('Skipping WhatsApp message without remoteJid');
      return;
    }

    if (message.key?.fromMe) {
      this.logger.log('Skipping WhatsApp message sent by the connected account', {
        remoteJid,
      });
      return;
    }

    if (!this.isDirectChat(remoteJid)) {
      this.logger.log('Skipping WhatsApp message because it is not a direct chat', {
        remoteJid,
      });
      return;
    }

    const number = this.extractPhoneNumber(remoteJid);
    this.logger.log(number);

    try {
      await socket.sendMessage(remoteJid, { text: 'Hello' });
    } catch (error) {
      this.logger.error(
        `Failed to reply to WhatsApp message from ${number}`,
        error,
      );
    }
  }

  private isDirectChat(remoteJid: string): boolean {
    return remoteJid.endsWith('@s.whatsapp.net') || remoteJid.endsWith('@lid');
  }

  private extractPhoneNumber(remoteJid: string): string {
    return remoteJid.split('@')[0] ?? remoteJid;
  }
}
