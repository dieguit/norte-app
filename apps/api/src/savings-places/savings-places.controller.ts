import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { CreateSavingsPlaceDto, RenameSavingsPlaceDto, SavingsPlaceIdParamsDto, SavingsPlaceMutationResponseDto, SavingsTransferDto, SavingsTransferResponseDto } from './savings-places.dto';
import { SavingsPlacesService } from './savings-places.service';
type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('savings-places')
@UseGuards(ClerkAuthGuard)
@ApiTags('savings-places')
export class SavingsPlacesController {
  constructor(private readonly savings: SavingsPlacesService) {}
  @Post()
  @ApiOperation({ summary: 'Create or return an owned savings place' })
  @ZodResponse({ type: SavingsPlaceMutationResponseDto, status: HttpStatus.CREATED })
  create(@Req() req: AuthenticatedRequest, @Body(new ZodValidationPipe(CreateSavingsPlaceDto)) body: CreateSavingsPlaceDto) { return this.savings.create(req.user.id, body.name); }
  @Patch(':id')
  @ApiOperation({ summary: 'Rename an owned savings place' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  rename(@Req() req: AuthenticatedRequest, @Param(new ZodValidationPipe(SavingsPlaceIdParamsDto)) params: SavingsPlaceIdParamsDto, @Body(new ZodValidationPipe(RenameSavingsPlaceDto)) body: RenameSavingsPlaceDto) { return this.savings.rename(req.user.id, params.id, body.name); }
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unused owned savings place' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Req() req: AuthenticatedRequest, @Param(new ZodValidationPipe(SavingsPlaceIdParamsDto)) params: SavingsPlaceIdParamsDto) { return this.savings.delete(req.user.id, params.id); }
  @Post('transfers')
  @ApiOperation({ summary: 'Transfer savings between owned places' })
  @ZodResponse({ type: SavingsTransferResponseDto, status: HttpStatus.CREATED })
  transfer(@Req() req: AuthenticatedRequest, @Body(new ZodValidationPipe(SavingsTransferDto)) body: SavingsTransferDto) { return this.savings.transfer(req.user.id, body); }
}
