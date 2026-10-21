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
import { ApiParam } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  WHATSAPP_ADAPTER,
  type WhatsappAdapter,
} from './whatsapp.adapter.provider';
import { WhatsappLinkTokenPathDto } from './whatsapp.dto';
import { WhatsappLinksService } from './whatsapp-links.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('whatsapp/links')
@UseGuards(ClerkAuthGuard)
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly links: WhatsappLinksService,
    @Inject(WHATSAPP_ADAPTER) private readonly adapter: WhatsappAdapter | null,
  ) {}

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
        if (this.adapter)
          await this.adapter.postMessage(
            await this.adapter.openDM(jid),
            '✅ WhatsApp vinculado a tu cuenta Norte',
          );
      } catch (error) {
        this.logger.warn(`WhatsApp link confirmation failed: ${String(error)}`);
      }
    }
    return { linked: true };
  }
}
