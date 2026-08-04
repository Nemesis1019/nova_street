import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DesignTemplatesService } from './design-templates.service';
import { DesignTemplateResponseDto } from './dto/design-template-response.dto';

@ApiTags('design-templates')
@Controller('design-templates')
export class DesignTemplatesController {
  constructor(private readonly designTemplatesService: DesignTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List available design templates' })
  @ApiOkResponse({ type: [DesignTemplateResponseDto], description: 'List of design templates' })
  findAll() {
    return this.designTemplatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a design template by id' })
  @ApiOkResponse({ type: DesignTemplateResponseDto, description: 'Design template details' })
  findOne(@Param('id') id: string) {
    return this.designTemplatesService.findOne(id);
  }
}
