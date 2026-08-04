import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CatalogService } from './catalog.service';
import {
  CategoryDto,
  ProductDetailDto,
  ProductListResponseDto,
} from './dto/catalog-response.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { SearchSuggestionsResponseDto } from './dto/search-suggestions.dto';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalogService.findActiveCategories();
  }

  @Get('categories/:slug')
  @ApiOkResponse({ type: CategoryDto })
  category(@Param('slug') slug: string) {
    return this.catalogService.findCategoryBySlug(slug);
  }

  @Get('products')
  @ApiOkResponse({ type: ProductListResponseDto })
  products(@Query() query: ListProductsQueryDto) {
    return this.catalogService.findProducts(query);
  }

  @Get('products/:slug')
  @ApiOkResponse({ type: ProductDetailDto })
  product(@Param('slug') slug: string) {
    return this.catalogService.findProductBySlug(slug);
  }

  @Get('search-suggestions')
  @ApiOkResponse({ type: SearchSuggestionsResponseDto })
  searchSuggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.catalogService.searchSuggestions(q ?? '', limit ? Math.min(Number(limit), 10) : 5);
  }
}
