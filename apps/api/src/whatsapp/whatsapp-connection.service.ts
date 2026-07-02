import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  type BaileysEventMap,
  type WASocket,
} from '@whiskeysockets/baileys';
import * as qrcode from 'qrcode-terminal';
import { WhatsappAuthStoreService } from './whatsapp-auth-store.service';
import { WhatsappMessageService } from './whatsapp-message.service';

@Injectable()
export class WhatsappConnectionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(WhatsappConnectionService.name);
  private socket?: WASocket;
  private connecting = false;
  private isShuttingDown = false;

  constructor(
    private readonly authStore: WhatsappAuthStoreService,
    private readonly messageService: WhatsappMessageService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.connect();
  }

  onApplicationShutdown(signal?: string): void {
    this.isShuttingDown = true;
    if (signal) {
      this.logger.log(`Closing WhatsApp socket after ${signal}`);
    }

    void this.socket?.end(undefined);
    this.socket = undefined;
  }

  private async connect(): Promise<void> {
    if (this.connecting || this.isShuttingDown) {
      return;
    }

    this.connecting = true;

    try {
      const { state, saveCreds } = await this.authStore.createAuthState();
      const socket = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu('Norte API'),
      });

      this.socket = socket;
      socket.ev.on('creds.update', () => {
        void saveCreds();
      });
      socket.ev.on('connection.update', (update) => {
        void this.handleConnectionUpdate(update);
      });
      socket.ev.on('messages.upsert', (event) => {
        void this.handleMessagesUpsert(event, socket);
      });
    } finally {
      this.connecting = false;
    }
  }

  private async handleMessagesUpsert(
    event: BaileysEventMap['messages.upsert'],
    socket: WASocket,
  ): Promise<void> {
    try {
      const remoteJids = event.messages.map(
        (message) => message.key?.remoteJid ?? 'unknown',
      );
      const type = event.type || 'notify';

      this.logger.log('WhatsApp messages.upsert received', {
        type,
        count: event.messages.length,
        remoteJids,
      });

      if (type !== 'notify') {
        this.logger.log(
          'Skipping WhatsApp messages.upsert because it is not a live notification',
          { type },
        );
        return;
      }

      await this.messageService.handleMessages(event.messages, socket);
    } catch (error) {
      this.logger.error('Failed to handle WhatsApp messages.upsert', error);
    }
  }

  private async handleConnectionUpdate(
    update: BaileysEventMap['connection.update'],
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'connecting') {
      this.logger.log('WhatsApp connecting...');
      return;
    }

    if (connection === 'open') {
      this.logger.log('WhatsApp connection opened');
      return;
    }

    if (connection !== 'close' || this.isShuttingDown) {
      return;
    }

    const statusCode = this.getDisconnectStatusCode(lastDisconnect?.error);

    if (statusCode === DisconnectReason.loggedOut) {
      this.logger.error(
        'WhatsApp connection closed because the account is logged out',
      );
      return;
    }

    this.logger.error(
      'WhatsApp connection closed; reconnecting',
      lastDisconnect?.error,
    );
    await this.connect();
  }

  private getDisconnectStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const maybeBoom = error as { output?: { statusCode?: number } };
    return maybeBoom.output?.statusCode;
  }
}
