import {
  Injectable,
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
      console.log(`Closing WhatsApp socket after ${signal}`);
    }

    this.socket?.end(undefined);
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
      socket.ev.on('creds.update', saveCreds);
      socket.ev.on('connection.update', (update) => {
        void this.handleConnectionUpdate(update);
      });
      socket.ev.on('messages.upsert', (event) => {
        void this.messageService.handleMessages(event.messages, socket);
      });
    } finally {
      this.connecting = false;
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
      console.log('WhatsApp connecting...');
      return;
    }

    if (connection === 'open') {
      console.log('WhatsApp connection opened');
      return;
    }

    if (connection !== 'close' || this.isShuttingDown) {
      return;
    }

    const statusCode = this.getDisconnectStatusCode(lastDisconnect?.error);

    if (statusCode === DisconnectReason.loggedOut) {
      console.error('WhatsApp connection closed because the account is logged out');
      return;
    }

    console.error('WhatsApp connection closed; reconnecting', lastDisconnect?.error);
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
