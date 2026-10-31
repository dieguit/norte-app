import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ZodResponse,
  ZodValidationPipe,
  ZodSerializerInterceptor,
} from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  BenefitBankListDto,
  BenefitProfileDto,
  UpdateBenefitProfileDto,
  BenefitSearchQueryDto,
  BenefitSearchResultDto,
  BenefitDetailDto,
  BenefitIdDto,
} from './benefits.dto';
import { BenefitsService } from './benefits.service';
type AuthenticatedRequest = Request & { user: { id: string } };
@Controller()
@UseGuards(ClerkAuthGuard)
@UseInterceptors(ZodSerializerInterceptor)
export class BenefitsController {
  constructor(private readonly benefits: BenefitsService) {}
  @Get('benefits/banks')
  @ZodResponse({ type: BenefitBankListDto })
  banks() {
    return this.benefits.banks();
  }
  @Get('me/benefits/preferences')
  @ZodResponse({ type: BenefitProfileDto })
  preferences(@Req() request: AuthenticatedRequest) {
    return this.benefits.getPreferences(request.user.id);
  }
  @Put('me/benefits/preferences')
  @ZodResponse({ type: BenefitProfileDto })
  save(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateBenefitProfileDto))
    body: UpdateBenefitProfileDto,
  ) {
    return this.benefits.savePreferences(request.user.id, body);
  }
  @Get('me/benefits/search')
  @ZodResponse({ type: BenefitSearchResultDto })
  search(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(BenefitSearchQueryDto))
    query: BenefitSearchQueryDto,
  ) {
    return this.benefits.search(request.user.id, query);
  }
  @Get('me/benefits/campaigns/:id')
  @ZodResponse({ type: BenefitDetailDto })
  detail(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(BenefitIdDto)) params: BenefitIdDto,
  ) {
    return this.benefits.detail(request.user.id, params.id);
  }
}
