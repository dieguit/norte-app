import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiParam, ApiQuery, getSchemaPath } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllocationChangeDraftDto, AllocationChangePreviewDto, AllocationChangeStaleDto, AllocationChangeUpdatedDto, ConfirmAllocationChangeDto, ConfirmGoalCompletionDto, ConfirmGoalCreationDto, ConfirmGoalLifecycleDto, GoalCompletionCompletedDto, GoalCompletionContextPresentDto, GoalCompletionInvalidDto, GoalCompletionPreviewBodyDto, GoalCompletionPreviewDto, GoalCompletionStaleDto, GoalCreationContextMissingDto, GoalCreationCreatedDto, GoalCreationDraftDto, GoalCreationPreviewDto, GoalCreationStaleDto, GoalEditConfirmDto, GoalEditDraftDto, GoalEditStaleDto, GoalEditUpdatedDto, GoalIdPathDto, GoalLifecyclePreviewBodyDto, GoalLifecyclePreviewDto, GoalLifecycleStaleDto, GoalLifecycleUpdatedDto, GoalPlanContextPresentDto, GoalPlanQueryDto, GoalsWorkspaceMissingDto, GoalsWorkspacePresentDto } from './goals.dto';
import { GoalsService } from './goals.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('goals')
@UseGuards(ClerkAuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  @ApiExtraModels(GoalsWorkspaceMissingDto, GoalsWorkspacePresentDto)
  @ApiOkResponse({ schema: { oneOf: [
    { $ref: getSchemaPath(GoalsWorkspaceMissingDto) },
    { $ref: getSchemaPath(GoalsWorkspacePresentDto) },
  ] } })
  getWorkspace(@Req() request: AuthenticatedRequest) {
    return this.goals.getWorkspace(request.user.id);
  }

  @Get('plan')
  @ApiQuery({ name: 'goalId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'action', required: false, enum: ['pause', 'resume'] })
  @ApiExtraModels(GoalCreationContextMissingDto, GoalPlanContextPresentDto)
  @ApiOkResponse({ schema: { oneOf: [{ $ref: getSchemaPath(GoalCreationContextMissingDto) }, { $ref: getSchemaPath(GoalPlanContextPresentDto) }] } })
  getCreationContext(@Req() request: AuthenticatedRequest, @Query(new ZodValidationPipe(GoalPlanQueryDto)) query: GoalPlanQueryDto) {
    if (query.action) return this.goals.getLifecyclePlanContext(request.user.id, query.goalId!, query.action);
    return this.goals.getPlanContext(request.user.id, query.goalId);
  }

  @Post('preview')
  @HttpCode(200)
  @ApiOkResponse({ type: GoalCreationPreviewDto })
  previewCreation(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(GoalCreationDraftDto)) body: GoalCreationDraftDto) {
    return this.goals.previewCreation(request.user.id, body);
  }

  @Post()
  @HttpCode(200)
  @ApiExtraModels(GoalCreationCreatedDto, GoalCreationStaleDto)
  @ApiOkResponse({ schema: { oneOf: [{ $ref: getSchemaPath(GoalCreationCreatedDto) }, { $ref: getSchemaPath(GoalCreationStaleDto) }] } })
  confirmCreation(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(ConfirmGoalCreationDto)) body: ConfirmGoalCreationDto) {
    return this.goals.confirmCreation(request.user.id, body);
  }

  @Post('allocation/preview')
  @HttpCode(200)
  @ApiOkResponse({ type: AllocationChangePreviewDto })
  previewAllocationChange(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(AllocationChangeDraftDto)) body: AllocationChangeDraftDto) {
    return this.goals.previewAllocationChange(request.user.id, body);
  }

  @Put('allocation')
  @HttpCode(200)
  @ApiExtraModels(AllocationChangeUpdatedDto, AllocationChangeStaleDto)
  @ApiOkResponse({ schema: { oneOf: [
    { $ref: getSchemaPath(AllocationChangeUpdatedDto) },
    { $ref: getSchemaPath(AllocationChangeStaleDto) },
  ] } })
  confirmAllocationChange(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(ConfirmAllocationChangeDto)) body: ConfirmAllocationChangeDto) {
    return this.goals.confirmAllocationChange(request.user.id, body);
  }

  @Post(':id/preview')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: GoalCreationPreviewDto })
  previewEdit(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto,
    @Body(new ZodValidationPipe(GoalEditDraftDto)) body: GoalEditDraftDto) {
    return this.goals.previewEdit(request.user.id, params.id, body);
  }

  @Post(':id/lifecycle/preview')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: GoalLifecyclePreviewDto })
  previewLifecycle(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto,
    @Body(new ZodValidationPipe(GoalLifecyclePreviewBodyDto)) body: GoalLifecyclePreviewBodyDto) {
    return this.goals.previewLifecycle(request.user.id, params.id, body);
  }

  @Post(':id/lifecycle')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiExtraModels(GoalLifecycleUpdatedDto, GoalLifecycleStaleDto)
  @ApiOkResponse({ schema: { oneOf: [{ $ref: getSchemaPath(GoalLifecycleUpdatedDto) }, { $ref: getSchemaPath(GoalLifecycleStaleDto) }] } })
  confirmLifecycle(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto,
    @Body(new ZodValidationPipe(ConfirmGoalLifecycleDto)) body: ConfirmGoalLifecycleDto) {
    return this.goals.confirmLifecycle(request.user.id, params.id, body);
  }

  @Get(':id/completion')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiExtraModels(GoalCreationContextMissingDto, GoalCompletionContextPresentDto)
  @ApiOkResponse({ schema: { oneOf: [{ $ref: getSchemaPath(GoalCreationContextMissingDto) }, { $ref: getSchemaPath(GoalCompletionContextPresentDto) }] } })
  getCompletionContext(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto) {
    return this.goals.getCompletionContext(request.user.id, params.id);
  }

  @Post(':id/completion/preview')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: GoalCompletionPreviewDto })
  previewCompletion(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto,
    @Body(new ZodValidationPipe(GoalCompletionPreviewBodyDto)) body: GoalCompletionPreviewBodyDto) {
    return this.goals.previewCompletion(request.user.id, params.id, body);
  }

  @Post(':id/completion')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiExtraModels(GoalCompletionCompletedDto, GoalCompletionStaleDto, GoalCompletionInvalidDto)
  @ApiOkResponse({ schema: { oneOf: [
    { $ref: getSchemaPath(GoalCompletionCompletedDto) },
    { $ref: getSchemaPath(GoalCompletionStaleDto) },
    { $ref: getSchemaPath(GoalCompletionInvalidDto) },
  ] } })
  confirmCompletion(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto,
    @Body(new ZodValidationPipe(ConfirmGoalCompletionDto)) body: ConfirmGoalCompletionDto) {
    return this.goals.confirmCompletion(request.user.id, params.id, body);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiExtraModels(GoalEditUpdatedDto, GoalEditStaleDto)
  @ApiOkResponse({ schema: { oneOf: [{ $ref: getSchemaPath(GoalEditUpdatedDto) }, { $ref: getSchemaPath(GoalEditStaleDto) }] } })
  confirmEdit(@Req() request: AuthenticatedRequest, @Param(new ZodValidationPipe(GoalIdPathDto)) params: GoalIdPathDto,
    @Body(new ZodValidationPipe(GoalEditConfirmDto)) body: GoalEditConfirmDto) {
    return this.goals.confirmEdit(request.user.id, params.id, body);
  }
}
