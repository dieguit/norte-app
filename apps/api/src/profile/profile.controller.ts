import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';
import { ProfileResponseDto } from './profile.dto';
import { ProfileService } from './profile.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('me/profile')
@UseGuards(ClerkAuthGuard)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  @ZodResponse({ type: ProfileResponseDto })
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.profiles.getProfile(request.user.id);
  }
}
