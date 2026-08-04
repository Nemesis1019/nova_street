import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AddressesModule } from './addresses/addresses.module';
import { AdminCatalogModule } from './admin-catalog/admin-catalog.module';
import { AdminCouponsModule } from './admin-coupons/admin-coupons.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BackupModule } from './backup/backup.module';
import { CartModule } from './cart/cart.module';
import { CatalogModule } from './catalog/catalog.module';
import { CheckoutModule } from './checkout/checkout.module';
import { RedisCacheStore } from './common/redis-cache.store';
import { CurrenciesModule } from './currencies/currencies.module';
import { CustomDesignsModule } from './custom-designs/custom-designs.module';
import { DesignTemplatesModule } from './design-templates/design-templates.module';
import { EmailModule } from './email/email.module';
import { ExportModule } from './export/export.module';
import { HealthModule } from './health/health.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OrdersModule } from './orders/orders.module';
import { PagesModule } from './pages/pages.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductionModule } from './production/production.module';
import { QueuesModule } from './queues/queues.module';
import { RefundsModule } from './refunds/refunds.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => {
        if (config.get<string>('NODE_ENV') === 'test') {
          return { ttl: 300_000 };
        }
        const store = new RedisCacheStore(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return { store, ttl: 300_000 };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30,
        skipIf: (context) => {
          if (process.env.NODE_ENV === 'test') {
            return true;
          }
          const request = context.switchToHttp().getRequest<{ url?: string }>();
          const url = request.url ?? '';
          // Skip payment gateway routes.
          return (
            url.startsWith('/checkout') || url.startsWith('/webhooks') || url.startsWith('/payments')
          );
        },
      },
    ]),
    PrismaModule,
    UsersModule,
    WishlistModule,
    AuthModule,
    CatalogModule,
    AdminCatalogModule,
    AdminCouponsModule,
    AdminOrdersModule,
    AdminUsersModule,
    AdminDashboardModule,
    AnalyticsModule,
    AuditModule,
    BackupModule,
    CartModule,
    CheckoutModule,
    CurrenciesModule,
    CustomDesignsModule,
    DesignTemplatesModule,
    AddressesModule,
    AssetsModule,
    OrdersModule,
    PaymentModule,
    ProductionModule,
    QueuesModule,
    ShipmentsModule,
    ReviewsModule,
    RefundsModule,
    StoreConfigModule,
    EmailModule,
    ExportModule,
    HealthModule,
    NewsletterModule,
    PagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
