import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { FinancesQueryDto, FinancesWorkspaceDto } from './finances.dto';
import { FinancesService } from './finances.service';

type AuthenticatedRequest = Request & { user: { id: string } };
@Controller('finances')
@UseGuards(ClerkAuthGuard)
export class FinancesController {
  constructor(private readonly finances: FinancesService) {}
  @Get()
  @ApiExtraModels(FinancesWorkspaceDto)
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(FinancesWorkspaceDto) }],
      nullable: true,
    },
  })
  async getWorkspace(
    @Req() request: AuthenticatedRequest,
    @Query() query: FinancesQueryDto,
    @Res() response: Response,
  ) {
    return response
      .status(200)
      .json(await this.finances.getWorkspace(request.user.id, query.month));
  }
}
