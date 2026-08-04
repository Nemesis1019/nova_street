import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminCategoryService } from './admin-category.service';
import { CategoryDetailDto, CategoryResponseDto } from './dto/admin-catalog-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly adminCategoryService: AdminCategoryService) {}

  @Post()
  @ApiOkResponse({ type: CategoryResponseDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.adminCategoryService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [CategoryResponseDto] })
  findAll() {
    return this.adminCategoryService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryDetailDto })
  findOne(@Param('id') id: string) {
    return this.adminCategoryService.findById(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  remove(@Param('id') id: string) {
    return this.adminCategoryService.remove(id);
  }
}
