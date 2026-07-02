import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto, ZodSerializerInterceptor } from 'nestjs-zod';
import {
  CreateUserDto,
  UserListResponseDto,
  UserParamsDto,
  UserResponseDto,
} from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseInterceptors(ZodSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, type: UserListResponseDto })
  @ZodSerializerDto(UserListResponseDto)
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  findOne(@Param() params: UserParamsDto): Promise<UserResponseDto> {
    return this.usersService.findOne(params.id);
  }
}
