import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiQuery, getSchemaPath } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodResponse, ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  HomeQueryDto,
  HomeRoadmapMissingDto,
  HomeRoadmapPresentDto,
  HomeRoadmapResponseDto,
} from './home.dto';
import { HomeService } from './home.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('home')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(ZodSerializerInterceptor)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiQuery({ name: 'currentMonth', required: false, example: '2026-08' })
  @ApiExtraModels(HomeRoadmapMissingDto, HomeRoadmapPresentDto)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(HomeRoadmapMissingDto) },
        { $ref: getSchemaPath(HomeRoadmapPresentDto) },
      ],
    },
  })
  @ZodResponse({ type: HomeRoadmapResponseDto })
  getHome(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(HomeQueryDto)) query: HomeQueryDto,
  ) {
    return this.homeService.getHome(request.user.id, query.currentMonth);
  }
}
