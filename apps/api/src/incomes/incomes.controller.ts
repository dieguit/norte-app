import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  CreateIncomeBodySchema,
  CreateIncomeDto,
  IncomeIdParamsDto,
  IncomeResponseDto,
  UpdateIncomeBodySchema,
  UpdateIncomeDto,
} from './incomes.dto';
import { IncomesService } from './incomes.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('incomes')
@UseGuards(ClerkAuthGuard)
export class IncomesController {
  constructor(private readonly incomes: IncomesService) {}

  @Post()
  @ZodResponse({ type: IncomeResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateIncomeDto)) body: CreateIncomeDto,
  ) {
    return this.incomes.create(
      request.user.id,
      CreateIncomeBodySchema.parse(body),
    );
  }

  @Patch(':id')
  @ZodResponse({ type: IncomeResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(IncomeIdParamsDto)) params: IncomeIdParamsDto,
    @Body(new ZodValidationPipe(UpdateIncomeDto)) body: UpdateIncomeDto,
  ) {
    return this.incomes.update(
      request.user.id,
      params.id,
      UpdateIncomeBodySchema.parse(body),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(IncomeIdParamsDto)) params: IncomeIdParamsDto,
  ) {
    return this.incomes.delete(request.user.id, params.id);
  }
}
