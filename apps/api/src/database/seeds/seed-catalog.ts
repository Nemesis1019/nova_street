import { PrismaClient, StockMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const remeras = await prisma.category.upsert({
    where: { slug: 'remeras' },
    update: {},
    create: {
      name: 'Remeras',
      slug: 'remeras',
      description: 'Remeras de algodón y poliéster',
      isActive: true,
    },
  });

  const product = await prisma.product.upsert({
    where: { slug: 'remera-basica-personalizable' },
    update: {},
    create: {
      name: 'Remera básica personalizable',
      slug: 'remera-basica-personalizable',
      description: 'Remera clásica para personalizar con tu diseño.',
      categoryId: remeras.id,
      basePrice: 45_000,
      isActive: true,
    },
  });

  const variants = [
    { sku: 'REM-BAS-PRE-M', size: 'M', color: 'Preta', garmentType: 'Remera' },
    { sku: 'REM-BAS-PRE-L', size: 'L', color: 'Preta', garmentType: 'Remera' },
    { sku: 'REM-BAS-BLA-M', size: 'M', color: 'Blanca', garmentType: 'Remera' },
  ];

  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: {},
      create: {
        productId: product.id,
        ...variant,
        stockMode: StockMode.MADE_TO_ORDER,
        productionLeadTimeDays: 7,
        isActive: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Catalog seeded');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
