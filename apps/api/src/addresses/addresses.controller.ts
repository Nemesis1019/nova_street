import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { AddressResponseDto } from './dto/address-response.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOkResponse({ type: AddressResponseDto })
  create(@Req() req: Request, @Body() dto: CreateAddressDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.addressesService.create(userId, dto);
  }

  @Get()
  @ApiOkResponse({ type: [AddressResponseDto] })
  findAll(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.addressesService.findAll(userId);
  }

  @Delete(':id')
  @ApiOkResponse({ type: AddressResponseDto })
  remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    return this.addressesService.remove(userId, id);
  }
}
