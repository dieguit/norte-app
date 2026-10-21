import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  NotificationSettingDto,
  NotificationSettingsResponseDto,
  NotificationTypeParamsDto,
  UpdateNotificationSettingDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('me/notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ZodResponse({ type: NotificationSettingsResponseDto })
  async list(@Req() request: AuthenticatedRequest) {
    return { settings: await this.notifications.listSettings(request.user.id) };
  }

  @Patch(':type')
  @ZodResponse({ type: NotificationSettingDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(NotificationTypeParamsDto))
    params: NotificationTypeParamsDto,
    @Body(new ZodValidationPipe(UpdateNotificationSettingDto))
    body: UpdateNotificationSettingDto,
  ) {
    return this.notifications.updateSetting(request.user.id, params.type, body);
  }
}
