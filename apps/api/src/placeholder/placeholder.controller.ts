import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto, ZodSerializerInterceptor } from 'nestjs-zod';
import { PlaceholderService } from './placeholder.service';
import { CreatePlaceholderDto } from './dto/create-placeholder.dto';
import { UpdatePlaceholderDto } from './dto/update-placeholder.dto';
import {
  DeletePlaceholderResponseDto,
  PlaceholderListResponseDto,
  PlaceholderResponseDto,
} from './dto/placeholder-response.dto';

@ApiTags('placeholder')
@Controller('placeholder')
@UseInterceptors(ZodSerializerInterceptor)
export class PlaceholderController {
  constructor(private readonly placeholderService: PlaceholderService) {}

  @Post()
  @ApiOperation({ summary: 'TODO: create placeholder item' })
  @ApiResponse({ status: 201, type: PlaceholderResponseDto })
  @ZodSerializerDto(PlaceholderResponseDto)
  create(
    @Body() createPlaceholderDto: CreatePlaceholderDto,
  ): PlaceholderResponseDto {
    return this.placeholderService.create(createPlaceholderDto);
  }

  @Get()
  @ApiOperation({ summary: 'TODO: list placeholder items' })
  @ApiResponse({ status: 200, type: PlaceholderListResponseDto })
  @ZodSerializerDto(PlaceholderListResponseDto)
  findAll(): PlaceholderListResponseDto {
    return this.placeholderService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'TODO: get placeholder item' })
  @ApiResponse({ status: 200, type: PlaceholderResponseDto })
  @ZodSerializerDto(PlaceholderResponseDto)
  findOne(@Param('id') id: string): PlaceholderResponseDto {
    return this.placeholderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'TODO: update placeholder item' })
  @ApiResponse({ status: 200, type: PlaceholderResponseDto })
  @ZodSerializerDto(PlaceholderResponseDto)
  update(
    @Param('id') id: string,
    @Body() updatePlaceholderDto: UpdatePlaceholderDto,
  ): PlaceholderResponseDto {
    return this.placeholderService.update(id, updatePlaceholderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'TODO: delete placeholder item' })
  @ApiResponse({ status: 200, type: DeletePlaceholderResponseDto })
  @ZodSerializerDto(DeletePlaceholderResponseDto)
  remove(@Param('id') id: string): DeletePlaceholderResponseDto {
    this.placeholderService.remove(id);
    return { success: true };
  }
}
