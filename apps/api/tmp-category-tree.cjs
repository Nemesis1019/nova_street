const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Remeras', slug: 'remeras', description: 'Remeras oversize y boxy de algodón premium.' },
  { name: 'Buzos y Hoodies', slug: 'buzos', description: 'Buzos, hoodies y camperas de edición limitada.' },
  { name: 'Gorras', slug: 'gorras', description: 'Gorras trucker y dad hats.' },
  { name: 'Pantalones', slug: 'pantalones', description: 'Cargos, joggers y siluetas utility.' },
  { name: 'Accesorios', slug: 'accesorios', description: 'Complementos para el día a día.' },
  { name: 'Oversize', slug: 'remeras-oversize', parentSlug: 'remeras', description: 'Remeras oversize y boxy.' },
  { name: 'Básicas', slug: 'remeras-basicas', parentSlug: 'remeras', description: 'Remeras de calce regular.' },
  { name: 'Hoodies', slug: 'buzos-hoodies', parentSlug: 'buzos', description: 'Hoodies y buzos de frisa.' },
  { name: 'Camperas', slug: 'buzos-camperas', parentSlug: 'buzos', description: 'Camperas y abrigos.' },
  { name: 'Trucker', slug: 'gorras-trucker', parentSlug: 'gorras', description: 'Gorras trucker con malla.' },
  { name: 'Dad Hats', slug: 'gorras-dad-hats', parentSlug: 'gorras', description: 'Gorras dad hat de algodón.' },
  { name: 'Cargos', slug: 'pantalones-cargos', parentSlug: 'pantalones', description: 'Pantalones cargo utility.' },
  { name: 'Joggers', slug: 'pantalones-joggers', parentSlug: 'pantalones', description: 'Joggers y calces tapered.' },
  { name: 'Bolsos', slug: 'accesorios-bolsos', parentSlug: 'accesorios', description: 'Bolsos y totes.' },
  { name: 'Medias', slug: 'accesorios-medias', parentSlug: 'accesorios', description: 'Medias y calcetines.' },
];

const SUBCATEGORY_BY_PRODUCT = {
  'remera-oversize-autonomy': 'remeras-oversize',
  'remera-boxy-nocturna': 'remeras-oversize',
  'remera-clasica-esencial': 'remeras-basicas',
  'buzo-hoodie-urban': 'buzos-hoodies',
  'buzo-oversize-grid': 'buzos-hoodies',
  'campera-bomber-midnight': 'buzos-camperas',
  'gorra-trucker-nova': 'gorras-trucker',
  'gorra-dad-hat-logo': 'gorras-dad-hats',
  'pantalon-cargo-utility': 'pantalones-cargos',
  'jogger-off-duty': 'pantalones-joggers',
  'tote-bag-daily': 'accesorios-bolsos',
  'medias-stripe-x3': 'accesorios-medias',
};

(async () => {
  const bySlug = {};

  for (const category of CATEGORIES.filter((item) => !item.parentSlug)) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, isActive: true, parentId: null },
      create: { name: category.name, slug: category.slug, description: category.description, isActive: true },
    });
    bySlug[category.slug] = row.id;
  }

  for (const category of CATEGORIES.filter((item) => item.parentSlug)) {
    const parentId = bySlug[category.parentSlug] ?? null;
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, isActive: true, parentId },
      create: { name: category.name, slug: category.slug, description: category.description, isActive: true, parentId },
    });
    bySlug[category.slug] = row.id;
  }

  let moved = 0;
  for (const [productSlug, categorySlug] of Object.entries(SUBCATEGORY_BY_PRODUCT)) {
    const result = await prisma.product.updateMany({
      where: { slug: productSlug },
      data: { categoryId: bySlug[categorySlug] },
    });
    moved += result.count;
  }

  const tree = await prisma.category.findMany({
    where: { parentId: { not: null } },
    select: { name: true, parent: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`✔ ${Object.keys(bySlug).length} categorías | ${moved} productos reasignados`);
  console.log(tree.map((item) => `${item.parent?.name} → ${item.name}`).join(' | '));

  await prisma.$disconnect();
})();
