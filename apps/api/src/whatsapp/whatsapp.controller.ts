import {
  ConflictException,
  Controller,
  GoneException,
  HttpCode,
  Inject,
  Logger,
  NotFoundException,
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
import { getPostHog, linkDistinctId } from '../analytics/posthog';
import type { Env } from '../config/env';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  WHATSAPP_ADAPTER,
  type ChatChannel,
} from './whatsapp.adapter.provider';
import { WhatsappLinkTokenPathDto } from './whatsapp.dto';
import { WhatsappLinksService } from './whatsapp-links.service';

function linkFailureReason(error: unknown) {
  if (error instanceof NotFoundException) return 'not_found';
  if (error instanceof GoneException) return 'expired';
  if (error instanceof ConflictException) return 'conflict';
  return 'error';
}

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
    const userId = request.user.id;
    const posthog = getPostHog();
    const channel = this.channel?.key;
    const { jid, alreadyClaimed } = await this.links
      .claim(token, userId)
      .catch((error: unknown) => {
        posthog.capture({
          distinctId: userId,
          event: 'bot_link_failed',
          properties: { channel, reason: linkFailureReason(error) },
        });
        throw error;
      });
    if (!alreadyClaimed) {
      posthog.alias({ distinctId: userId, alias: linkDistinctId(token) });
      posthog.capture({
        distinctId: userId,
        event: 'bot_account_linked',
        properties: { channel },
      });
      try {
        if (this.channel) {
          const { firstName } = await this.clerk.users.getUser(userId);
          await this.channel.adapter.postMessage(
            await this.channel.adapter.openDM(jid),
            `Hola${firstName ? ` ${firstName}` : ''}! Ya asociamos este número a tu usuario de Norte. Te cuento qué podés hacer en este asistente?`,
          );
        }
      } catch (error) {
        this.logger.warn(`WhatsApp link confirmation failed: ${String(error)}`);
      }
    }
    return { linked: true };
  }
}
