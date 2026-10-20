import {
  ConfirmGoalCompletionWireSchema,
  GoalCompletionCompletedSchema,
  GoalCompletionContextPresentSchema,
  GoalCompletionInvalidSchema,
  GoalCompletionPreviewSchema,
  GoalCompletionPreviewWireSchema,
  GoalCompletionStaleSchema,
  ConfirmGoalLifecycleWireSchema,
  GoalLifecyclePreviewSchema,
  GoalLifecyclePreviewWireSchema,
  GoalLifecycleStaleSchema,
  GoalLifecycleUpdatedSchema,
  AllocationChangeDraftWireSchema,
  AllocationChangePreviewSchema,
  AllocationChangeStaleSchema,
  AllocationChangeUpdatedSchema,
  ConfirmAllocationChangeWireSchema,
  ConfirmGoalCreationWireSchema,
  GoalCreationContextMissingSchema,
  GoalCreationContextPresentSchema,
  GoalCreationCreatedSchema,
  GoalCreationDraftWireSchema,
  GoalCreationPreviewSchema,
  GoalCreationStaleSchema,
  GoalEditConfirmWireSchema,
  GoalEditUpdatedSchema,
  GoalEditStaleSchema,
  GoalIdPathWireSchema,
  GoalPlanContextPresentSchema,
  GoalPlanQueryWireSchema,
  GoalsWorkspaceMissingSchema,
  GoalsWorkspacePresentSchema,
} from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';

export class GoalsWorkspaceMissingDto extends createZodDto(
  GoalsWorkspaceMissingSchema,
) {}
export class GoalsWorkspacePresentDto extends createZodDto(
  GoalsWorkspacePresentSchema,
) {}
export class GoalCreationDraftDto extends createZodDto(
  GoalCreationDraftWireSchema,
) {}
export class ConfirmGoalCreationDto extends createZodDto(
  ConfirmGoalCreationWireSchema,
) {}
export class GoalCreationContextMissingDto extends createZodDto(
  GoalCreationContextMissingSchema,
) {}
export class GoalCreationPreviewDto extends createZodDto(
  GoalCreationPreviewSchema,
) {}
export class GoalCreationCreatedDto extends createZodDto(
  GoalCreationCreatedSchema,
) {}
export class GoalCreationStaleDto extends createZodDto(
  GoalCreationStaleSchema,
) {}
export class GoalPlanQueryDto extends createZodDto(GoalPlanQueryWireSchema) {}
export class GoalIdPathDto extends createZodDto(GoalIdPathWireSchema) {}
export class GoalPlanContextPresentDto extends createZodDto(
  GoalPlanContextPresentSchema,
) {}
export class GoalLifecyclePreviewBodyDto extends createZodDto(
  GoalLifecyclePreviewWireSchema,
) {}
export class ConfirmGoalLifecycleDto extends createZodDto(
  ConfirmGoalLifecycleWireSchema,
) {}
export class GoalLifecyclePreviewDto extends createZodDto(
  GoalLifecyclePreviewSchema,
) {}
export class GoalLifecycleUpdatedDto extends createZodDto(
  GoalLifecycleUpdatedSchema,
) {}
export class GoalLifecycleStaleDto extends createZodDto(
  GoalLifecycleStaleSchema,
) {}
export class GoalCompletionContextPresentDto extends createZodDto(
  GoalCompletionContextPresentSchema,
) {}
export class GoalCompletionPreviewBodyDto extends createZodDto(
  GoalCompletionPreviewWireSchema,
) {}
export class ConfirmGoalCompletionDto extends createZodDto(
  ConfirmGoalCompletionWireSchema,
) {}
export class GoalCompletionPreviewDto extends createZodDto(
  GoalCompletionPreviewSchema,
) {}
export class GoalCompletionCompletedDto extends createZodDto(
  GoalCompletionCompletedSchema,
) {}
export class GoalCompletionStaleDto extends createZodDto(
  GoalCompletionStaleSchema,
) {}
export class GoalCompletionInvalidDto extends createZodDto(
  GoalCompletionInvalidSchema,
) {}
export class GoalEditDraftDto extends createZodDto(
  GoalCreationDraftWireSchema,
) {}
export class GoalEditConfirmDto extends createZodDto(
  GoalEditConfirmWireSchema,
) {}
export class GoalEditUpdatedDto extends createZodDto(GoalEditUpdatedSchema) {}
export class GoalEditStaleDto extends createZodDto(GoalEditStaleSchema) {}
export class AllocationChangeDraftDto extends createZodDto(
  AllocationChangeDraftWireSchema,
) {}
export class ConfirmAllocationChangeDto extends createZodDto(
  ConfirmAllocationChangeWireSchema,
) {}
export class AllocationChangePreviewDto extends createZodDto(
  AllocationChangePreviewSchema,
) {}
export class AllocationChangeUpdatedDto extends createZodDto(
  AllocationChangeUpdatedSchema,
) {}
export class AllocationChangeStaleDto extends createZodDto(
  AllocationChangeStaleSchema,
) {}
