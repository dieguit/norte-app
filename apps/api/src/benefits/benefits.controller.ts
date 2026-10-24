import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  BenefitCatalogResponseDto,
  BenefitPreferencesDto,
  UpdateBenefitPreferencesDto,
} from './benefits.dto';
import { BenefitsService } from './benefits.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller()
@UseGuards(ClerkAuthGuard)
export class BenefitsController {
  constructor(private readonly benefits: BenefitsService) {}

  @Get('benefits/catalog')
  @ZodResponse({ type: BenefitCatalogResponseDto })
  catalog() {
    return this.benefits.catalog();
  }

  @Get('me/benefits/preferences')
  @ZodResponse({ type: BenefitPreferencesDto })
  preferences(@Req() request: AuthenticatedRequest) {
    return this.benefits.getPreferences(request.user.id);
  }

  @Put('me/benefits/preferences')
  @ZodResponse({ type: BenefitPreferencesDto })
  save(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateBenefitPreferencesDto))
    body: UpdateBenefitPreferencesDto,
  ) {
    return this.benefits.savePreferences(request.user.id, body);
  }
}
