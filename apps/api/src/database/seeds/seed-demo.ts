import { DEFAULT_CURRENCY_CODE } from '@ecommerce/shared';
import { AssetPurpose, DiscountType, PrismaClient, StockMode } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/png';

async function main() {
  // Clean existing catalog data to ensure a fresh demo
  await prisma.productImage.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator' },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: { name: 'CUSTOMER', description: 'Customer' },
  });

  // Users
  const adminPassword = await argon2.hash('Admin1234');
  const admin2Password = await argon2.hash('Admin2345');
  const customerPassword = await argon2.hash('Customer1234');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tienda.com' },
    update: {},
    create: {
      email: 'admin@tienda.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Tienda',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const _adminUser2 = await prisma.user.upsert({
    where: { email: 'admin2@tienda.com' },
    update: {},
    create: {
      email: 'admin2@tienda.com',
      passwordHash: admin2Password,
      firstName: 'Admin',
      lastName: 'Secundario',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const _customerUser = await prisma.user.upsert({
    where: { email: 'customer@tienda.com' },
    update: {},
    create: {
      email: 'customer@tienda.com',
      passwordHash: customerPassword,
      firstName: 'Cliente',
      lastName: 'Demo',
      roleId: customerRole.id,
      isActive: true,
    },
  });

  // Store config: deactivate existing configs and create demo config
  await prisma.storeConfig.updateMany({
    where: {},
    data: { isActive: false },
  });

  await prisma.storeConfig.create({
    data: {
      name: 'Mi Tienda Demo',
      description: 'Ropa personalizada de prueba',
      logoUrl: 'https://placehold.co/100x100/png?text=Logo',
      faviconUrl: 'https://placehold.co/32x32/png?text=F',
      primaryColor: '#228be6',
      secondaryColor: '#15aabf',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      heroImageUrl: 'https://placehold.co/1200x400/png?text=Hero',
      heroTitle: 'Bienvenidos a Mi Tienda Demo',
      heroSubtitle: 'Personalizá tu ropa con estilo',
      contactEmail: 'contacto@tienda.com',
      contactPhone: '+57 300 1234567',
      socialLinks: JSON.stringify({ instagram: '@tiendademo', facebook: 'tiendademo' }),
      currencyCode: DEFAULT_CURRENCY_CODE,
      isActive: true,
      updatedById: adminUser.id,
    },
  });

  // Currencies
  await prisma.currency.upsert({
    where: { code: DEFAULT_CURRENCY_CODE },
    update: {},
    create: {
      code: DEFAULT_CURRENCY_CODE,
      name: 'Peso colombiano',
      symbol: '$',
      exchangeRate: 1,
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  });

  await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: {
      code: 'USD',
      name: 'Dólar estadounidense',
      symbol: 'US$',
      exchangeRate: 0.00023,
      isDefault: false,
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      exchangeRate: 0.00021,
      isDefault: false,
      isActive: true,
      sortOrder: 2,
    },
  });

  // Store settings
  await prisma.storeSettings.upsert({
    where: { id: (await prisma.storeSettings.findFirst())?.id ?? '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      defaultStockMode: StockMode.MADE_TO_ORDER,
      productionLeadTimeDaysDefault: 7,
      shippingCostDefault: 10_000,
    },
  });

  // Categories
  const categoriesData = [
    { name: 'Remeras', slug: 'remeras', description: 'Remeras de algodón y poliéster' },
    { name: 'Gorras', slug: 'gorras', description: 'Gorras personalizables' },
    { name: 'Buzos', slug: 'buzos', description: 'Buzos y hoodies' },
  ];

  const categories: Record<string, { id: string; name: string; slug: string }> = {};
  for (const category of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category, isActive: true },
    });
    categories[category.slug] = cat;
  }

  // Products + variants + images
  const productsData = [
    {
      name: 'Remera básica personalizable',
      slug: 'remera-basica-personalizable',
      description: 'Remera clásica para personalizar con tu diseño.',
      basePrice: 45_000,
      categorySlug: 'remeras',
      stockMode: StockMode.MADE_TO_ORDER,
      variants: [
        { sku: 'REM-BAS-PRE-S', size: 'S', color: 'Preta' },
        { sku: 'REM-BAS-PRE-M', size: 'M', color: 'Preta' },
        { sku: 'REM-BAS-PRE-L', size: 'L', color: 'Preta' },
        { sku: 'REM-BAS-BLA-M', size: 'M', color: 'Blanca' },
      ],
    },
    {
      name: 'Gorra trucker',
      slug: 'gorra-trucker',
      description: 'Gorra estilo trucker con panel frontal personalizable.',
      basePrice: 35_000,
      categorySlug: 'gorras',
      stockMode: StockMode.TRACKED,
      variants: [
        { sku: 'GOR-TRA-NEG', size: 'Único', color: 'Negro' },
        { sku: 'GOR-TRA-BLA', size: 'Único', color: 'Blanco' },
      ],
    },
    {
      name: 'Buzo oversize',
      slug: 'buzo-oversize',
      description: 'Buzo oversize con interior afelpado.',
      basePrice: 95_000,
      categorySlug: 'buzos',
      stockMode: StockMode.MADE_TO_ORDER,
      variants: [
        { sku: 'BUZ-OVE-GRI-M', size: 'M', color: 'Gris' },
        { sku: 'BUZ-OVE-GRI-L', size: 'L', color: 'Gris' },
      ],
    },
    {
      name: 'Remera premium estampada',
      slug: 'remera-premium-estampada',
      description: 'Remera premium con estampado de alta calidad.',
      basePrice: 55_000,
      categorySlug: 'remeras',
      stockMode: StockMode.TRACKED,
      variants: [
        { sku: 'REM-PRE-AZU-S', size: 'S', color: 'Azul' },
        { sku: 'REM-PRE-AZU-M', size: 'M', color: 'Azul' },
      ],
    },
  ];

  for (const productData of productsData) {
    const { variants, categorySlug, stockMode, ...productFields } = productData;

    const product = await prisma.product.upsert({
      where: { slug: productFields.slug },
      update: {},
      create: {
        ...productFields,
        categoryId: categories[categorySlug].id,
        isActive: true,
      },
    });

    // Product image asset
    const asset = await prisma.asset.upsert({
      where: { id: (await prisma.asset.findFirst({ where: { relatedId: product.id } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: {
        ownerId: adminUser.id,
        purpose: AssetPurpose.CATALOG_IMAGE,
        relatedId: product.id,
        bucket: 'demo',
        objectKey: `${PLACEHOLDER_IMAGE}?text=${encodeURIComponent(product.name)}`,
        mimeType: 'image/png',
        size: 0,
      },
    });

    await prisma.productImage.upsert({
      where: { id: (await prisma.productImage.findFirst({ where: { productId: product.id } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: {
        productId: product.id,
        assetId: asset.id,
        sortOrder: 0,
      },
    });

    for (const variantData of variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: variantData.sku },
        update: {},
        create: {
          productId: product.id,
          ...variantData,
          garmentType: categorySlug === 'remeras' ? 'Remera' : categorySlug === 'gorras' ? 'Gorra' : 'Buzo',
          stockMode,
          productionLeadTimeDays: 7,
          isActive: true,
        },
      });

      if (stockMode === StockMode.TRACKED) {
        await prisma.inventory.upsert({
          where: { productVariantId: variant.id },
          update: {},
          create: {
            productVariantId: variant.id,
            quantity: 10,
            reservedQuantity: 0,
          },
        });
      }
    }
  }

  // Coupons
  const now = new Date();
  const couponsData = [
    { code: 'BIENVENIDO', discountType: DiscountType.PERCENTAGE, discountValue: 10, maxUses: 100 },
    { code: 'DESCUENTO5000', discountType: DiscountType.FIXED, discountValue: 5_000, maxUses: 50 },
  ];

  for (const coupon of couponsData) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: {
        ...coupon,
        validFrom: now,
        validUntil: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        isActive: true,
      },
    });
  }

  // Design templates
  await prisma.designTemplate.upsert({
    where: { id: (await prisma.designTemplate.findFirst())?.id ?? '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      name: 'Remera frontal',
      garmentType: 'Remera',
      baseImageUrl: PLACEHOLDER_IMAGE,
      printAreas: JSON.stringify({ front: { x: 100, y: 100, width: 300, height: 300 } }),
      basePrice: 45_000,
      availableColors: ['Preta', 'Blanca', 'Gris'],
      availableSizes: ['S', 'M', 'L'],
      stockMode: StockMode.MADE_TO_ORDER,
      productionLeadTimeDays: 7,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Demo data seeded');
  // eslint-disable-next-line no-console
  console.log(`Admin users: admin@tienda.com / Admin1234, admin2@tienda.com / Admin2345`);
  // eslint-disable-next-line no-console
  console.log(`Customer user: customer@tienda.com / Customer1234`);
}

  main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
