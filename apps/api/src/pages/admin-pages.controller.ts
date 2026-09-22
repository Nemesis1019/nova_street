import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CreatePageDto } from './dto/create-page.dto';
import { PageListResponseDto, PageResponseDto } from './dto/page-response.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PagesService } from './pages.service';

@ApiTags('admin-pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permission.PAGES_WRITE)
  @ApiOkResponse({ type: PageResponseDto })
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Get()
  @RequirePermission(Permission.PAGES_READ)
  @ApiOkResponse({ type: PageListResponseDto })
  findAll() {
    return this.pagesService.findAllAdmin().then((data) => ({ data }));
  }

  @Get(':id')
  @RequirePermission(Permission.PAGES_READ)
  @ApiOkResponse({ type: PageResponseDto })
  findOne(@Param('id') id: string) {
    return this.pagesService.findByIdAdmin(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.PAGES_WRITE)
  @ApiOkResponse({ type: PageResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.PAGES_WRITE)
  remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }
}
