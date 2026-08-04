import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrenciesService, type CurrencyRecord } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

export class CurrencyResponseDto {
  id!: string;
  code!: string;
  name!: string;
  symbol!: string;
  exchangeRate!: number;
  isDefault!: boolean;
  isActive!: boolean;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

@ApiTags('currencies')
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOkResponse({ type: [CurrencyResponseDto] })
  findActive(): Promise<CurrencyRecord[]> {
    return this.currenciesService.findActive();
  }
}

@ApiTags('admin-currencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/currencies')
export class AdminCurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOkResponse({ type: [CurrencyResponseDto] })
  findAll(): Promise<CurrencyRecord[]> {
    return this.currenciesService.findAll();
  }

  @Post()
  @ApiOkResponse({ type: CurrencyResponseDto })
  create(@Body() dto: CreateCurrencyDto): Promise<CurrencyRecord> {
    return this.currenciesService.create(dto);
  }

  @Patch(':code')
  @ApiOkResponse({ type: CurrencyResponseDto })
  update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto): Promise<CurrencyRecord> {
    return this.currenciesService.update(code.toUpperCase(), dto);
  }

  @Delete(':code')
  @ApiOkResponse({ type: CurrencyResponseDto })
  remove(@Param('code') code: string): Promise<CurrencyRecord> {
    return this.currenciesService.remove(code.toUpperCase());
  }
}
