import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ZodResponse,
  ZodSerializerInterceptor,
  ZodValidationPipe,
} from 'nestjs-zod';
import { ClerkAuthGuard } from '../../profile/clerk-auth.guard';
import { BenefitsAdminGuard } from '../benefits-admin.guard';
import * as dto from './explorer.dto';
import { BenefitsExplorerService } from './explorer.service';

@Controller('admin/benefits/explorer')
@UseGuards(ClerkAuthGuard, BenefitsAdminGuard)
@UseInterceptors(ZodSerializerInterceptor)
export class BenefitsExplorerController {
  constructor(private readonly explorer: BenefitsExplorerService) {}

  @Get('campaigns')
  @ZodResponse({ type: dto.ExplorerCampaignListDto })
  campaigns(
    @Query(new ZodValidationPipe(dto.ExplorerQueryDto))
    query: dto.ExplorerQueryDto,
  ) {
    return this.explorer.campaigns(query);
  }

  @Get('campaigns/:id')
  @ZodResponse({ type: dto.ExplorerCampaignDetailDto })
  campaign(
    @Param(new ZodValidationPipe(dto.ExplorerIdDto)) { id }: dto.ExplorerIdDto,
  ) {
    return this.explorer.campaign(id);
  }

  @Patch('campaigns/:id')
  @ZodResponse({ type: dto.ExplorerOkDto })
  hide(
    @Param(new ZodValidationPipe(dto.ExplorerIdDto)) { id }: dto.ExplorerIdDto,
    @Body(new ZodValidationPipe(dto.ExplorerHiddenDto))
    { hidden }: dto.ExplorerHiddenDto,
    @Req() request: { user: { id: string } },
  ) {
    return this.explorer.hide(id, hidden, `clerk:${request.user.id}`);
  }

  @Get('overview')
  @ZodResponse({ type: dto.ExplorerOverviewDto })
  overview() {
    return this.explorer.overview();
  }

  @Get('brands')
  @ZodResponse({ type: dto.ExplorerBrandListDto })
  brands(
    @Query(new ZodValidationPipe(dto.ExplorerBrandsQueryDto))
    query: dto.ExplorerBrandsQueryDto,
  ) {
    return this.explorer.brands(query);
  }

  @Patch('brands/:id')
  @ZodResponse({ type: dto.ExplorerOkDto })
  aliases(
    @Param(new ZodValidationPipe(dto.ExplorerIdDto)) { id }: dto.ExplorerIdDto,
    @Body(new ZodValidationPipe(dto.ExplorerAliasesDto))
    body: dto.ExplorerAliasesDto,
  ) {
    return this.explorer.aliases(id, body.aliases);
  }

  @Post('brands/merge')
  @ZodResponse({ type: dto.ExplorerOkDto })
  merge(
    @Body(new ZodValidationPipe(dto.ExplorerMergeDto))
    body: dto.ExplorerMergeDto,
  ) {
    return this.explorer.merge(body.fromId, body.intoId);
  }

  @Get('mappings')
  @ZodResponse({ type: dto.ExplorerMappingListDto })
  mappings() {
    return this.explorer.mappings();
  }

  @Patch('mappings')
  @ZodResponse({ type: dto.ExplorerOkDto })
  mapping(
    @Body(new ZodValidationPipe(dto.ExplorerMappingPatchDto))
    body: dto.ExplorerMappingPatchDto,
    @Req() request: { user: { id: string } },
  ) {
    return this.explorer.mapping(body, `clerk:${request.user.id}`);
  }
}
