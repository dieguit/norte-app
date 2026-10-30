import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  ExplorerQuerySchema,
  ExplorerCampaignListSchema,
  ExplorerCampaignDetailSchema,
  ExplorerOverviewSchema,
  ExplorerBrandListSchema,
  ExplorerMappingListSchema,
  ExplorerAliasesPatchSchema,
  ExplorerMappingPatchSchema,
  ExplorerMergeSchema,
} from '@repo/shared-types';

export class ExplorerQueryDto extends createZodDto(ExplorerQuerySchema) {}
export class ExplorerIdDto extends createZodDto(
  z.object({ id: z.string().uuid() }),
) {}
export class ExplorerBrandsQueryDto extends createZodDto(
  ExplorerQuerySchema.pick({ q: true, page: true, pageSize: true }),
) {}
export class ExplorerHiddenDto extends createZodDto(
  z.object({ hidden: z.boolean() }),
) {}
export class ExplorerAliasesDto extends createZodDto(
  ExplorerAliasesPatchSchema,
) {}
export class ExplorerMappingPatchDto extends createZodDto(
  ExplorerMappingPatchSchema.refine(
    (value) => /^(pd:\d+(\/\d+)?|galicia:[^\r\n]+)$/.test(value.sourceKey),
    'Invalid category source key',
  ),
) {}
export class ExplorerMergeDto extends createZodDto(ExplorerMergeSchema) {}
export class ExplorerCampaignListDto extends createZodDto(
  ExplorerCampaignListSchema,
) {}
export class ExplorerCampaignDetailDto extends createZodDto(
  ExplorerCampaignDetailSchema,
) {}
export class ExplorerOverviewDto extends createZodDto(ExplorerOverviewSchema) {}
export class ExplorerBrandListDto extends createZodDto(
  ExplorerBrandListSchema,
) {}
export class ExplorerMappingListDto extends createZodDto(
  ExplorerMappingListSchema,
) {}
export class ExplorerOkDto extends createZodDto(
  z.object({ ok: z.literal(true) }),
) {}
