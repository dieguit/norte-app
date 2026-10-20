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
  CreateExpenseDto,
  DeleteExpenseDto,
  ExpenseIdParamsDto,
  ExpenseResponseDto,
  UpdateExpenseDto,
} from './expenses.dto';
import { ExpensesService } from './expenses.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('expenses')
@UseGuards(ClerkAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @ZodResponse({ type: ExpenseResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateExpenseDto)) body: CreateExpenseDto,
  ) {
    return this.expenses.create(request.user.id, body);
  }

  @Patch(':id')
  @ZodResponse({ type: ExpenseResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(ExpenseIdParamsDto))
    params: ExpenseIdParamsDto,
    @Body(new ZodValidationPipe(UpdateExpenseDto)) body: UpdateExpenseDto,
  ) {
    return this.expenses.update(request.user.id, params.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(ExpenseIdParamsDto))
    params: ExpenseIdParamsDto,
    @Body(new ZodValidationPipe(DeleteExpenseDto)) body: DeleteExpenseDto,
  ) {
    return this.expenses.delete(
      request.user.id,
      params.id,
      body.effectiveMonth,
    );
  }
}
