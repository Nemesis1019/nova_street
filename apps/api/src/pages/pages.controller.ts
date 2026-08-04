import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PageListResponseDto, PageResponseDto } from './dto/page-response.dto';
import { PagesService } from './pages.service';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOkResponse({ type: PageListResponseDto })
  findVisible() {
    return this.pagesService.findVisible().then((data) => ({ data }));
  }

  @Get(':slug')
  @ApiOkResponse({ type: PageResponseDto })
  findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }
}
