import {
  Controller,
  HttpCode,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiParam } from '@nestjs/swagger';
import { createClerkClient } from '@clerk/backend';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request } from 'express';
import type { Env } from '../config/env';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  WHATSAPP_ADAPTER,
  type ChatChannel,
} from './whatsapp.adapter.provider';
import { WhatsappLinkTokenPathDto } from './whatsapp.dto';
import { WhatsappLinksService } from './whatsapp-links.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('whatsapp/links')
@UseGuards(ClerkAuthGuard)
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly clerk: ReturnType<typeof createClerkClient>;

  constructor(
    private readonly links: WhatsappLinksService,
    @Inject(WHATSAPP_ADAPTER) private readonly channel: ChatChannel | null,
    config: ConfigService<Env>,
  ) {
    this.clerk = createClerkClient({
      secretKey: config.getOrThrow('CLERK_SECRET_KEY'),
    });
  }

  @Post(':token/claim')
  @HttpCode(200)
  @ApiParam({ name: 'token' })
  async claim(
    @Param(new ZodValidationPipe(WhatsappLinkTokenPathDto))
    { token }: WhatsappLinkTokenPathDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { jid, alreadyClaimed } = await this.links.claim(
      token,
      request.user.id,
    );
    if (!alreadyClaimed) {
      try {
        if (this.channel) {
          const { firstName } = await this.clerk.users.getUser(request.user.id);
          await this.channel.adapter.postMessage(
            await this.channel.adapter.openDM(jid),
            `Hola${firstName ? ` ${firstName}` : ''}! Ya asociamos este número a tu usuario.`,
          );
        }
      } catch (error) {
        this.logger.warn(`WhatsApp link confirmation failed: ${String(error)}`);
      }
    }
    return { linked: true };
  }
}
