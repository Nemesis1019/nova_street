export enum Permission {
  // Catalog
  PRODUCTS_READ = 'products:read',
  PRODUCTS_WRITE = 'products:write',
  CATEGORIES_READ = 'categories:read',
  CATEGORIES_WRITE = 'categories:write',
  STOCK_READ = 'stock:read',
  STOCK_WRITE = 'stock:write',
  VARIANTS_READ = 'variants:read',
  VARIANTS_WRITE = 'variants:write',

  // Orders & customers
  ORDERS_READ = 'orders:read',
  ORDERS_WRITE = 'orders:write',
  CUSTOMERS_READ = 'customers:read',
  CUSTOMERS_WRITE = 'customers:write',

  // Marketing & config
  COUPONS_READ = 'coupons:read',
  COUPONS_WRITE = 'coupons:write',
  STORE_CONFIG_READ = 'store_config:read',
  STORE_CONFIG_WRITE = 'store_config:write',
  SHIPPING_OPTIONS_READ = 'shipping_options:read',
  SHIPPING_OPTIONS_WRITE = 'shipping_options:write',
  CURRENCIES_READ = 'currencies:read',
  CURRENCIES_WRITE = 'currencies:write',

  // Assets & content
  ASSETS_READ = 'assets:read',
  ASSETS_WRITE = 'assets:write',
  PAGES_READ = 'pages:read',
  PAGES_WRITE = 'pages:write',
  REVIEWS_MODERATE = 'reviews:moderate',

  // Production
  PRODUCTION_READ = 'production:read',
  PRODUCTION_WRITE = 'production:write',
  CUSTOM_DESIGNS_READ = 'custom_designs:read',
  CUSTOM_DESIGNS_WRITE = 'custom_designs:write',

  // Users & access control
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  ROLES_READ = 'roles:read',
  ROLES_WRITE = 'roles:write',

  // Analytics & operations
  ANALYTICS_READ = 'analytics:read',
  AUDIT_LOGS_READ = 'audit_logs:read',
  EXPORTS_READ = 'exports:read',
  DASHBOARD_READ = 'dashboard:read',

  // Infrastructure
  BACKUPS_WRITE = 'backups:write',
  QUEUES_READ = 'queues:read',
  QUEUES_WRITE = 'queues:write',
  SHIPMENTS_READ = 'shipments:read',
  SHIPMENTS_WRITE = 'shipments:write',
}

export const DEFAULT_NEW_USER_PERMISSIONS: Permission[] = [
  Permission.DASHBOARD_READ,
  Permission.ORDERS_READ,
  Permission.PRODUCTS_READ,
  Permission.CATEGORIES_READ,
];

export const ALL_PERMISSIONS = Object.values(Permission);
