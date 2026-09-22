import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface SearchResults {
  products: Array<{ id: string; title: string; url: string }>;
  orders: Array<{ id: string; title: string; url: string }>;
  users: Array<{ id: string; title: string; url: string }>;
  pages: Array<{ id: string; title: string; url: string }>;
}

@Injectable()
export class AdminSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string): Promise<SearchResults> {
    const term = query.trim();
    if (!term) {
      return { products: [], orders: [], users: [], pages: [] };
    }

    const [products, orders, users, pages] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
            { variants: { some: { sku: { contains: term, mode: 'insensitive' } } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.order.findMany({
        where: {
          user: { email: { contains: term, mode: 'insensitive' } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      }),
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      this.prisma.page.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true },
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        title: p.name,
        url: `/products/${p.id}`,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        title: `Pedido ${o.id.slice(0, 8)} - ${o.status}`,
        url: `/orders/${o.id}`,
      })),
      users: users.map((u) => ({
        id: u.id,
        title: [u.firstName, u.lastName, `(${u.email})`].filter(Boolean).join(' '),
        url: `/users/${u.id}`,
      })),
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        url: `/pages`,
      })),
    };
  }
}
