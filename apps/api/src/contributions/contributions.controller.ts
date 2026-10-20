import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiParam, getSchemaPath } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  ConfirmSavingContributionDto,
  ContributionIdPathDto,
  SavingContributionContextMissingDto,
  SavingContributionContextPresentDto,
  SavingContributionCreatedDto,
  SavingContributionDeletedDto,
  SavingContributionDraftDto,
  SavingContributionEditPreviewDto,
  SavingContributionPreviewDto,
  SavingContributionStaleDto,
  SavingContributionUpdatedDto,
  UpdateSavingContributionDto,
} from './contributions.dto';
import { ContributionsService } from './contributions.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('contributions/saving')
@UseGuards(ClerkAuthGuard)
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Get('context')
  @ApiExtraModels(SavingContributionContextMissingDto, SavingContributionContextPresentDto)
  @ApiOkResponse({ schema: { oneOf: [
    { $ref: getSchemaPath(SavingContributionContextMissingDto) },
    { $ref: getSchemaPath(SavingContributionContextPresentDto) },
  ] } })
  getContext(@Req() request: AuthenticatedRequest) {
    return this.contributions.getContext(request.user.id);
  }

  @Post('preview')
  @HttpCode(200)
  @ApiOkResponse({ type: SavingContributionPreviewDto })
  previewSaving(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(SavingContributionDraftDto)) body: SavingContributionDraftDto) {
    return this.contributions.previewSaving(request.user.id, body);
  }

  @Post(':id/preview')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SavingContributionEditPreviewDto })
  previewSavingEdit(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(ContributionIdPathDto)) params: ContributionIdPathDto,
    @Body(new ZodValidationPipe(SavingContributionDraftDto)) body: SavingContributionDraftDto) {
    return this.contributions.previewSavingEdit(request.user.id, params.id, body);
  }

  @Post()
  @HttpCode(200)
  @ApiExtraModels(SavingContributionCreatedDto, SavingContributionStaleDto)
  @ApiOkResponse({ schema: { oneOf: [
    { $ref: getSchemaPath(SavingContributionCreatedDto) },
    { $ref: getSchemaPath(SavingContributionStaleDto) },
  ] } })
  confirmSaving(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(ConfirmSavingContributionDto)) body: ConfirmSavingContributionDto) {
    return this.contributions.confirmSaving(request.user.id, body);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SavingContributionUpdatedDto })
  updateSaving(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(ContributionIdPathDto)) params: ContributionIdPathDto,
    @Body(new ZodValidationPipe(UpdateSavingContributionDto)) body: UpdateSavingContributionDto) {
    return this.contributions.updateSaving(request.user.id, params.id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SavingContributionDeletedDto })
  deleteSaving(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(ContributionIdPathDto)) params: ContributionIdPathDto) {
    return this.contributions.deleteSaving(request.user.id, params.id);
  }
}
