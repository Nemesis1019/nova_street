import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CustomDesignStatus } from '@prisma/client';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CustomDesignsService } from './custom-designs.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CreateCustomDesignDto } from './dto/create-custom-design.dto';
import { CustomDesignListResponseDto, CustomDesignResponseDto } from './dto/custom-design-response.dto';
import { UpdateCustomDesignDto } from './dto/update-custom-design.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('custom-designs')
@Controller('custom-designs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomDesignsController {
  constructor(private readonly customDesignsService: CustomDesignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new custom design' })
  @ApiCreatedResponse({ type: CustomDesignResponseDto, description: 'Custom design created' })
  create(@Body() dto: CreateCustomDesignDto, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my custom designs' })
  @ApiOkResponse({ type: [CustomDesignResponseDto], description: 'List of custom designs' })
  findMyDesigns(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.findByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a custom design' })
  @ApiOkResponse({ type: CustomDesignResponseDto, description: 'Custom design details' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom design' })
  @ApiOkResponse({ type: CustomDesignResponseDto, description: 'Custom design updated' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomDesignDto, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.update(user.userId, id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a custom design for review' })
  @ApiOkResponse({ type: CustomDesignResponseDto, description: 'Custom design submitted' })
  submit(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.submit(user.userId, id);
  }

  @Post(':id/add-to-cart')
  @ApiOperation({ summary: 'Add custom design to cart' })
  @ApiOkResponse({ description: 'Custom design added to cart' })
  addToCart(@Param('id') id: string, @Body() dto: AddToCartDto, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.addToCart(user.userId, id, dto);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.CUSTOM_DESIGNS_READ)
  @ApiOperation({ summary: 'List all custom designs (admin)' })
  @ApiOkResponse({ type: CustomDesignListResponseDto, description: 'List of custom designs' })
  findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: CustomDesignStatus,
  ) {
    return this.customDesignsService.findAllForAdmin({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
    });
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @RequirePermission(Permission.CUSTOM_DESIGNS_WRITE)
  @ApiOperation({ summary: 'Update custom design status (admin)' })
  @ApiOkResponse({ description: 'Custom design status updated' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.customDesignsService.updateStatus(id, dto, user.userId);
  }
}
