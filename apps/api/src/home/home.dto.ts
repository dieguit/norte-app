import { createZodDto } from 'nestjs-zod';
import {
  HomeQuerySchema,
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema,
  HomeRoadmapResponseSchema,
} from '@repo/shared-types';

export class HomeQueryDto extends createZodDto(HomeQuerySchema) {}
export class HomeRoadmapMissingDto extends createZodDto(HomeRoadmapMissingSchema) {}
export class HomeRoadmapPresentDto extends createZodDto(HomeRoadmapPresentSchema) {}
export class HomeRoadmapResponseDto extends createZodDto(HomeRoadmapResponseSchema as any) {}
