import { BadGatewayException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

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

  /**
   * Sincroniza las tasas de cambio contra open.er-api.com usando la moneda default
   * como base (rate = unidades de la moneda por 1 unidad base).
   */
  async syncExchangeRates(): Promise<{
    base: string;
    updated: Array<{ code: string; previous: number; current: number }>;
    skipped: string[];
  }> {
    const currencies = await this.prisma.currency.findMany();
    const base = currencies.find((currency) => currency.isDefault)?.code;
    if (!base) {
      throw new NotFoundException('No default currency configured');
    }

    let payload: { result?: string; rates?: Record<string, number> };
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!response.ok) {
        throw new BadGatewayException(`Exchange rate provider error (${response.status})`);
      }
      payload = (await response.json()) as { result?: string; rates?: Record<string, number> };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Could not reach the exchange rate provider');
    }

    if (payload.result !== 'success' || !payload.rates) {
      throw new BadGatewayException('Exchange rate provider returned an invalid response');
    }

    const updated: Array<{ code: string; previous: number; current: number }> = [];
    const skipped: string[] = [];

    for (const currency of currencies) {
      if (currency.code === base) {
        if (toNumber(currency.exchangeRate) !== 1) {
          await this.prisma.currency.update({ where: { code: base }, data: { exchangeRate: 1 } });
        }
        continue;
      }

      const rate = payload.rates[currency.code];
      if (typeof rate !== 'number' || rate <= 0) {
        skipped.push(currency.code);
        continue;
      }

      const previous = toNumber(currency.exchangeRate);
      if (previous === rate) {
        continue;
      }

      await this.prisma.currency.update({
        where: { code: currency.code },
        data: { exchangeRate: rate },
      });
      updated.push({ code: currency.code, previous, current: rate });
    }

    return { base, updated, skipped };
  }
}
