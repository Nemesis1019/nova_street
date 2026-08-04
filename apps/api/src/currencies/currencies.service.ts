import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface CurrencyRecord {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value);
}

function mapCurrency<T extends { exchangeRate: unknown }>(record: T): Omit<T, 'exchangeRate'> & { exchangeRate: number } {
  return { ...record, exchangeRate: toNumber(record.exchangeRate) };
}

@Injectable()
export class CurrenciesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.currency.count();
    if (count === 0) {
      await this.prisma.currency.create({
        data: {
          code: 'COP',
          name: 'Peso colombiano',
          symbol: '$',
          exchangeRate: 1,
          isDefault: true,
          isActive: true,
          sortOrder: 0,
        },
      });
    }
  }

  async findActive(): Promise<CurrencyRecord[]> {
    const currencies = await this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return currencies.map(mapCurrency);
  }

  async findAll(): Promise<CurrencyRecord[]> {
    const currencies = await this.prisma.currency.findMany({
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    });
    return currencies.map(mapCurrency);
  }

  async create(data: {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
    isDefault?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<CurrencyRecord> {
    const normalized = {
      ...data,
      code: data.code.toUpperCase(),
      exchangeRate: data.exchangeRate,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    };

    if (normalized.isDefault) {
      await this.prisma.currency.updateMany({ data: { isDefault: false } });
    }

    const created = await this.prisma.currency.create({ data: normalized });
    return mapCurrency(created);
  }

  async update(code: string, data: Partial<{
    name: string;
    symbol: string;
    exchangeRate: number;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
  }>): Promise<CurrencyRecord> {
    const existing = await this.prisma.currency.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException('Currency not found');
    }

    if (data.isDefault) {
      await this.prisma.currency.updateMany({ data: { isDefault: false } });
    }

    const updated = await this.prisma.currency.update({
      where: { code },
      data: {
        ...data,
        code: data.name ? undefined : code,
      },
    });
    return mapCurrency(updated);
  }

  async remove(code: string): Promise<CurrencyRecord> {
    const existing = await this.prisma.currency.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException('Currency not found');
    }

    if (existing.isDefault) {
      throw new NotFoundException('Cannot delete the default currency');
    }

    const deleted = await this.prisma.currency.delete({ where: { code } });
    return mapCurrency(deleted);
  }
}
