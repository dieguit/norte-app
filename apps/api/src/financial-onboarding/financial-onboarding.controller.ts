import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  FinancialOnboardingDto,
  FinancialOnboardingResponseDto,
} from './financial-onboarding.dto';
import { FinancialOnboardingService } from './financial-onboarding.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('me/financial-onboarding')
@UseGuards(ClerkAuthGuard)
export class FinancialOnboardingController {
  constructor(private readonly onboarding: FinancialOnboardingService) {}

  @Post()
  @ApiBody({ type: FinancialOnboardingDto })
  @ZodResponse({ type: FinancialOnboardingResponseDto })
  complete(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.onboarding.complete(request.user.id, body);
  }
}
