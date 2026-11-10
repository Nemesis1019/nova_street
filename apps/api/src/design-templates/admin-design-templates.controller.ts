import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { DesignTemplatesService } from './design-templates.service';
import { CreateDesignTemplateDto, UpdateDesignTemplateDto } from './dto/design-template.dto';

@ApiTags('design-templates-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/design-templates')
export class AdminDesignTemplatesController {
  constructor(private readonly designTemplatesService: DesignTemplatesService) {}

  @Get()
  @RequirePermission(Permission.CUSTOM_DESIGNS_READ)
  @ApiOperation({ summary: 'Catálogo completo de prendas personalizables' })
  @ApiOkResponse({ description: 'Prendas, zonas, colores y reglas de precio' })
  findAll() {
    return this.designTemplatesService.findAllAdmin();
  }

  @Post()
  @RequirePermission(Permission.CUSTOM_DESIGNS_WRITE)
  @ApiOperation({ summary: 'Crear un tipo de prenda personalizable' })
  create(@Body() dto: CreateDesignTemplateDto) {
    return this.designTemplatesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(Permission.CUSTOM_DESIGNS_WRITE)
  @ApiOperation({ summary: 'Actualizar prenda, colores, zonas o pricing' })
  update(@Param('id') id: string, @Body() dto: UpdateDesignTemplateDto) {
    return this.designTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(Permission.CUSTOM_DESIGNS_WRITE)
  @ApiOperation({ summary: 'Eliminar o archivar una prenda personalizable' })
  remove(@Param('id') id: string) {
    return this.designTemplatesService.remove(id);
  }
}
