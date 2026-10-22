/**
 * Demo "Grano" — cafetería de especialidad.
 *
 * Personaliza SOLO la base del tenant demo (nunca la de nova/ecommerce):
 *   CAFE_DATABASE_URL="postgresql://ecommerce:ecommerce@localhost:5433/tenant_demo?schema=public" \
 *     pnpm --filter @ecommerce/api seed:demo-cafe
 *
 * Incluye marca, paleta, tipografías, home editorial, páginas, categorías,
 * productos con variantes y fotos externas de Unsplash (licencia libre).
 * Para producción conviene reemplazar las URLs externas por assets en R2.
 */
import { StorefrontConfigSchema } from '@ecommerce/shared';
import {
  AppearanceMode,
  AssetPurpose,
  Prisma,
  PrismaClient,
  StockMode,
} from '@prisma/client';

const databaseUrl = process.env.CAFE_DATABASE_URL;

if (!databaseUrl) {
  console.error(
    [
      'Falta CAFE_DATABASE_URL.',
      'Ejemplo:',
      '  CAFE_DATABASE_URL="postgresql://ecommerce:ecommerce@localhost:5433/tenant_demo?schema=public" pnpm --filter @ecommerce/api seed:demo-cafe',
    ].join('\n'),
  );
  process.exit(1);
}

let databaseName = '';
try {
  databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
} catch {
  console.error('CAFE_DATABASE_URL no es una URL válida.');
  process.exit(1);
}

if (!databaseName.toLowerCase().includes('demo') && process.env.CAFE_ALLOW_NON_DEMO !== '1') {
  console.error(
    `La base "${databaseName}" no parece ser la demo. Abortando para no tocar otros tenants.`,
  );
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

const photo = (id: string, width = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const HERO_IMAGE = photo('1545665225-b23b99e4d45e', 2000);
const HISTORY_IMAGE = photo('1445116572660-236099ec97a0', 1600);
const HANDS_IMAGE = photo('1495774856032-8b90bbb32b32', 1600);
const METHODS_IMAGE = photo('1442512595331-e89e73853f31', 1600);
const SUBSCRIPTION_IMAGE = photo('1541167760496-1628856ab772', 1600);

interface SeedVariant {
  sku: string;
  size: string;
  priceAdjustment?: number;
  stockMode?: StockMode;
  stock?: number;
  productionLeadTimeDays?: number;
}

interface SeedProduct {
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  basePrice: number;
  image: string;
  variants: SeedVariant[];
}

interface SeedPage {
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  sortOrder: number;
}

const categories = [
  {
    name: 'Café de origen',
    slug: 'cafe-de-origen',
    description: 'Cafés de finca, tostados en pequeños lotes.',
    sortOrder: 0,
  },
  {
    name: 'Métodos',
    slug: 'metodos',
    description: 'Herramientas para preparar café en casa.',
    sortOrder: 1,
  },
  {
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Cerámica y vidrio para la mesa.',
    sortOrder: 2,
  },
  {
    name: 'Suscripciones',
    slug: 'suscripciones',
    description: 'Café fresco todos los meses.',
    sortOrder: 3,
  },
];

const products: SeedProduct[] = [
  {
    name: 'Etiopía Guji',
    slug: 'etiopia-guji',
    description:
      'Lavado · Jazmín, durazno y miel. Un café luminoso, con acidez de té y un final dulce y perfumado. Tostado claro para V60, Chemex o filtro.',
    categorySlug: 'cafe-de-origen',
    basePrice: 52_000,
    image: photo('1459755486867-b55449bb39ff'),
    variants: [
      { sku: 'GRN-ETI-250', size: '250 g' },
      { sku: 'GRN-ETI-500', size: '500 g', priceAdjustment: 40_000 },
    ],
  },
  {
    name: 'Colombia Huila',
    slug: 'colombia-huila',
    description:
      'Lavado · Panela, cacao y naranja. Dulce y equilibrado, con cuerpo medio y un final limpio. Nuestro café de todos los días.',
    categorySlug: 'cafe-de-origen',
    basePrice: 48_000,
    image: photo('1524350876685-274059332603'),
    variants: [
      { sku: 'GRN-COL-250', size: '250 g' },
      { sku: 'GRN-COL-500', size: '500 g', priceAdjustment: 38_000 },
    ],
  },
  {
    name: 'Brasil Cerrado',
    slug: 'brasil-cerrado',
    description:
      'Natural · Avellana, chocolate y caramelo. Cuerpo sedoso y baja acidez, ideal para espresso, prensa francesa o café con leche.',
    categorySlug: 'cafe-de-origen',
    basePrice: 45_000,
    image: photo('1503481766315-7a586b20f66d'),
    variants: [
      { sku: 'GRN-BRA-250', size: '250 g' },
      { sku: 'GRN-BRA-500', size: '500 g', priceAdjustment: 35_000 },
    ],
  },
  {
    name: 'House Blend',
    slug: 'house-blend',
    description:
      'Chocolate, nuez y ciruela. Una mezcla pensada para la cafetería de la casa: dulce, redonda y versátil. Tostado medio.',
    categorySlug: 'cafe-de-origen',
    basePrice: 42_000,
    image: photo('1495474472287-4d71bcdd2085'),
    variants: [
      { sku: 'GRN-HOU-250', size: '250 g' },
      { sku: 'GRN-HOU-500', size: '500 g', priceAdjustment: 34_000 },
    ],
  },
  {
    name: 'Suscripción Origen',
    slug: 'suscripcion-origen',
    description:
      'Dos bolsas de 250 g para tu mes, elegidas por nuestro equipo según la cosecha. Café fresco, tostado a pedido, con envío incluido. La comprás cuando quieras.',
    categorySlug: 'suscripciones',
    basePrice: 98_000,
    image: photo('1541167760496-1628856ab772'),
    variants: [{ sku: 'GRN-SUB-MENSUAL', size: 'Mensual' }],
  },
  {
    name: 'Chemex 6 tazas',
    slug: 'chemex-6-tazas',
    description:
      'Chemex de vidrio borosilicato con collar de madera y correa de cuero. Un clásico para extraer cafés limpios, dulces y luminosos.',
    categorySlug: 'metodos',
    basePrice: 185_000,
    image: photo('1442512595331-e89e73853f31'),
    variants: [
      {
        sku: 'GRN-CHEMEX-6',
        size: '6 tazas',
        stockMode: StockMode.TRACKED,
        stock: 8,
        productionLeadTimeDays: 0,
      },
    ],
  },
  {
    name: 'Kit pour over',
    slug: 'kit-pour-over',
    description:
      'V60 de cerámica, jarra de vidrio y 40 filtros. Todo lo necesario para empezar a preparar café en casa.',
    categorySlug: 'metodos',
    basePrice: 120_000,
    image: photo('1545665225-b23b99e4d45e'),
    variants: [
      {
        sku: 'GRN-POUR-KIT',
        size: 'Kit completo',
        stockMode: StockMode.TRACKED,
        stock: 12,
        productionLeadTimeDays: 0,
      },
    ],
  },
  {
    name: 'Taza de cerámica',
    slug: 'taza-ceramica',
    description:
      'Taza de cerámica esmaltada de 250 ml, hecha a mano en pequeños lotes. Tapa el calor y acompaña la sobremesa.',
    categorySlug: 'accesorios',
    basePrice: 45_000,
    image: photo('1522992319-0365e5f11656'),
    variants: [
      {
        sku: 'GRN-TAZA-250',
        size: '250 ml',
        stockMode: StockMode.TRACKED,
        stock: 20,
        productionLeadTimeDays: 0,
      },
    ],
  },
  {
    name: 'Vasos de vidrio',
    slug: 'vasos-de-vidrio',
    description:
      'Set de dos vasos de vidrio soplado de 300 ml para café con leche, cold brew o espresso tonic.',
    categorySlug: 'accesorios',
    basePrice: 38_000,
    image: photo('1525480122447-64809d765ec4'),
    variants: [
      {
        sku: 'GRN-VASOS-2',
        size: 'Set x2',
        stockMode: StockMode.TRACKED,
        stock: 15,
        productionLeadTimeDays: 0,
      },
    ],
  },
];

const pages: SeedPage[] = [
  {
    slug: 'nuestra-historia',
    title: 'Nuestra historia',
    content: `
      <p><strong>Grano nació en 2021</strong> con una idea simple: acercar el café de especialidad a la mesa de todos los días. Empezamos tostando lotes pequeños para amigos y vecinos; hoy seguimos haciendo lo mismo, con más tazas.</p>
      <img src="${HISTORY_IMAGE}" alt="Interior de la cafetería Grano" style="width:100%;height:auto;display:block;margin:32px 0" />
      <h2>Del origen a la taza</h2>
      <p>Trabajamos con caficultores que cuidan el suelo, el agua y las variedades nativas. Compramos la cosecha directamente y pagamos un precio que reconoce el trabajo detrás de cada grano.</p>
      <p>Cada lote se tuesta en pequeños volúmenes, se prueba en taza y se despacha fresco. No buscamos un café perfecto: buscamos un café honesto, dulce y con historia.</p>
      <img src="${HANDS_IMAGE}" alt="Manos sosteniendo una taza de café" style="width:100%;height:auto;display:block;margin:32px 0" />
      <h2>Pequeños lotes</h2>
      <p>Tostamos los martes y jueves. Eso significa que tu bolsa puede llegar a los pocos días de haber salido del tostador, con las notas más vivas y el aroma intacto.</p>
      <blockquote>“El café es una excusa para encontrarnos. Lo demás es cuidar el detalle.”</blockquote>
      <p>Visitanos en nuestra cafetería de Bogotá o escríbenos a <a href="mailto:hola@grano.cafe">hola@grano.cafe</a>. Nos encanta hablar de café.</p>
    `,
    metaTitle: 'Nuestra historia — Grano',
    metaDescription: 'Cómo nació Grano y por qué tostamos café de especialidad en pequeños lotes.',
    sortOrder: 0,
  },
  {
    slug: 'metodos',
    title: 'Métodos de preparación',
    content: `
      <p>No hay una única forma de preparar café. Estas son las que más disfrutamos en la cafetería, con recetas simples para empezar en casa.</p>
      <img src="${METHODS_IMAGE}" alt="Chemex y café en la cafetería" style="width:100%;height:auto;display:block;margin:32px 0" />
      <h2>V60 · filtrado</h2>
      <p>15 g de café molido medio, 250 ml de agua a 93 °C. Enjuagá el filtro, agregá el café y verté en círculos lentos durante 2:30. Buscá una taza limpia, luminosa y aromática.</p>
      <h2>Chemex · filtrado</h2>
      <p>30 g de café molido medio-grueso, 500 ml de agua a 93 °C. Preinfusioná 40 segundos y continuá en tres vertidos. Ideal para compartir y para cafés dulces.</p>
      <h2>Prensa francesa · inmersión</h2>
      <p>30 g de café molido grueso, 500 ml de agua a 94 °C. Esperá 4 minutos, quebrá la costra, dejá reposar un minuto más y filtrá. Cuerpo y textura sin prisa.</p>
      <p>¿Buscás herramientas? Mirá nuestra colección de <a href="/catalogo?category=metodos">métodos</a>.</p>
    `,
    metaTitle: 'Métodos de preparación — Grano',
    metaDescription: 'Recetas de V60, Chemex y prensa francesa para preparar café en casa.',
    sortOrder: 1,
  },
  {
    slug: 'envios-y-devoluciones',
    title: 'Envíos y devoluciones',
    content: `
      <h2>Envíos</h2>
      <p>Tostamos los martes y jueves. Los pedidos se despachan en un plazo de 2 a 4 días hábiles y llegan a todo el país con nuestra transportadora aliada.</p>
      <p>El envío nacional tiene un costo de <strong>$12.000</strong> y es <strong>gratis en compras desde $90.000</strong>. También podés retirar en la cafetería sin costo, coordinando el horario por email.</p>
      <h2>Devoluciones</h2>
      <p>Si tu pedido llegó dañado o no es lo que esperabas, escribinos dentro de los 5 días siguientes a la entrega a <a href="mailto:hola@grano.cafe">hola@grano.cafe</a>. Los productos abiertos no tienen cambio, salvo que presenten un problema de calidad.</p>
      <h2>Suscripciones</h2>
      <p>La caja mensual se compra cuando quieras; no hay cobros automáticos. El envío está incluido.</p>
    `,
    metaTitle: 'Envíos y devoluciones — Grano',
    metaDescription: 'Tiempos de despacho, envío gratis desde $90.000 y política de devoluciones.',
    sortOrder: 2,
  },
  {
    slug: 'suscripcion',
    title: 'Suscripción de café',
    content: `
      <p>Una forma simple de tomar café fresco: elegimos dos bolsas de 250 g cada mes, las tostamos para vos y las enviamos a tu puerta. Sin contratos ni sorpresas.</p>
      <img src="${SUBSCRIPTION_IMAGE}" alt="Café con leche recién preparado" style="width:100%;height:auto;display:block;margin:32px 0" />
      <h2>Qué incluye</h2>
      <ul>
        <li>Dos bolsas de 250 g por mes, con cafés de temporada.</li>
        <li>Tostado a pedido y envío incluido.</li>
        <li>Notas de cata y una receta para preparar cada lote.</li>
        <li>La comprás cuando quieras, sin débito automático.</li>
      </ul>
      <p>El valor es de <strong>$98.000</strong> al mes. Podés suscribirte desde la ficha de <a href="/producto/suscripcion-origen">Suscripción Origen</a>.</p>
    `,
    metaTitle: 'Suscripción de café — Grano',
    metaDescription: 'Dos bolsas de café de especialidad por mes, tostadas a pedido y con envío incluido.',
    sortOrder: 3,
  },
  {
    slug: 'terminos-y-condiciones',
    title: 'Términos y condiciones',
    content: `
      <h2>1. Identidad</h2>
      <p>Este sitio es operado por <strong>Grano Café S.A.S.</strong> (NIT 901.000.000-1), con domicilio en Bogotá, Colombia. El uso del sitio implica aceptar estos términos.</p>
      <h2>2. Productos y precios</h2>
      <p>Los precios están expresados en pesos colombianos (COP) e incluyen impuestos. Las fotos son ilustrativas; el café es un producto natural y puede variar ligeramente entre cosechas.</p>
      <h2>3. Pedidos y pagos</h2>
      <p>Los pedidos se confirman una vez procesado el pago. Nos reservamos el derecho de cancelar un pedido si detectamos un error evidente de precio o falta de stock, con reembolso completo.</p>
      <h2>4. Envíos</h2>
      <p>Despachamos en un plazo de 2 a 4 días hábiles desde la confirmación. Los tiempos de entrega dependen de la transportadora y la ciudad de destino.</p>
      <h2>5. Devoluciones</h2>
      <p>Aceptamos cambios y devoluciones dentro de los 5 días posteriores a la entrega, siempre que el producto esté sin abrir. Los productos abiertos solo se cambian por problemas de calidad.</p>
      <h2>6. Datos personales</h2>
      <p>Usamos tus datos para procesar el pedido, enviar confirmaciones y brindar soporte. No vendemos información a terceros. Podés solicitar la eliminación de tus datos escribiendo a <a href="mailto:hola@grano.cafe">hola@grano.cafe</a>.</p>
      <h2>7. Contacto</h2>
      <p>Para cualquier consulta, escribinos a <a href="mailto:hola@grano.cafe">hola@grano.cafe</a> o visitanos en Calle 85 # 12-34, Bogotá.</p>
    `,
    metaTitle: 'Términos y condiciones — Grano',
    metaDescription: 'Términos de compra, envíos, devoluciones y tratamiento de datos de Grano Café.',
    sortOrder: 4,
  },
];

const templateConfig = {
  heroLayout: 'centered',
  showMarquee: false,
  showIdentitySection: false,
  productCardVariant: 'default',
  headerVariant: 'default',
  showHeroBadge: false,
  heroEyebrow: 'Café de especialidad · Tostado en pequeños lotes',
  heroPrimaryLabel: 'Comprar café',
  heroPrimaryHref: '/catalogo',
  heroSecondaryLabel: 'Nuestra historia',
  heroSecondaryHref: '/pagina/nuestra-historia',
  productEyebrow: 'Grano · Café de especialidad',
};

const storefrontConfig = StorefrontConfigSchema.parse({
  announcementBar: {
    enabled: true,
    text: 'Tostado esta semana · Envío gratis desde $90.000',
    link: '/catalogo',
    backgroundColor: '#1F1B16',
    textColor: '#FCF9F8',
  },
  navigation: [
    { label: 'Café', href: '/catalogo?category=cafe-de-origen', newTab: false },
    { label: 'Métodos', href: '/catalogo?category=metodos', newTab: false },
    { label: 'Accesorios', href: '/catalogo?category=accesorios', newTab: false },
    { label: 'Suscripción', href: '/catalogo?category=suscripciones', newTab: false },
    { label: 'Nosotros', href: '/pagina/nuestra-historia', newTab: false },
  ],
  homeSections: ['hero', 'featuredProducts', 'categories', 'collectionShowcase', 'promoBanner'],
  collectionShowcase: {
    title: 'Nuestros cafés',
    linkLabel: 'Ver todos los cafés',
    linkHref: '/catalogo?category=cafe-de-origen',
    categorySlug: 'cafe-de-origen',
    story: {
      enabled: true,
      title: 'Del origen a la taza',
      text: 'Trabajamos con caficultores que cuidan el suelo, el agua y las variedades nativas. Cada lote se tuesta en pequeños volúmenes para que llegue fresco a tu cocina.',
      linkLabel: 'Conocé nuestro proceso',
      linkHref: '/pagina/nuestra-historia',
    },
  },
  featuredProducts: {
    title: 'Recién tostado',
    limit: 8,
    columns: 4,
    sort: 'newest',
  },
  promoBanner: {
    enabled: true,
    title: 'Suscripción de café',
    subtitle:
      'Dos bolsas de 250 g cada mes, seleccionadas por nuestro equipo. Envío incluido. La comprás cuando quieras.',
    link: '/catalogo?category=suscripciones',
    backgroundColor: '#6F7A4E',
    textColor: '#FCF9F8',
  },
  footer: {
    showNewsletter: true,
    showSocialLinks: true,
    copyrightText: '© 2026 Grano Café. Tostado con cuidado.',
    extraLinks: [],
  },
  productCard: {
    showSku: false,
    showRating: false,
    showStockBadge: false,
    showWishlist: true,
    showQuickView: false,
  },
  productBadges: {
    showNew: false,
    showSale: false,
    showLowStock: false,
    lowStockThreshold: 5,
    newDaysThreshold: 14,
  },
  catalog: {
    defaultSort: 'newest',
    defaultPageSize: 12,
    showFilters: false,
  },
  relatedProducts: {
    enabled: true,
    strategy: 'sameCategory',
    limit: 4,
  },
  crossSell: {
    enabled: false,
    title: 'Para acompañar tu café',
    strategy: 'sameCategory',
    limit: 4,
  },
  cart: {
    trustBadges: ['Tostado a pedido', 'Envío en 2–4 días', 'Pago seguro'],
    showFreeShippingProgress: true,
  },
  checkout: {
    requirePhone: true,
    showCompanyField: false,
    showOrderNotes: true,
    thankYouMessage:
      'Gracias por tu compra. Tu café se tuesta y se despacha en 2 a 4 días hábiles.',
  },
  featureFlags: {
    enableWishlist: true,
    enableCompare: false,
    enableReviews: true,
    enableCustomizer: false,
    enableGuestCheckout: true,
    enableQuickView: false,
  },
  branding: {
    customCss: '',
  },
  seo: {
    defaultTitleTemplate: '{title} | {storeName}',
    defaultDescription:
      'Café de especialidad tostado en pequeños lotes. Origen, métodos y suscripciones.',
    ogImageUrl: HERO_IMAGE,
    productTitleTemplate: '{productName} — {storeName}',
    categoryTitleTemplate: '{categoryName} — {storeName}',
    pageTitleTemplate: '{pageTitle} — {storeName}',
  },
  externalScripts: [],
  whatsappButton: {
    enabled: false,
  },
  notFound: {
    title: 'Esta página se enfrió',
    message: 'No encontramos lo que buscabas. Volvé al catálogo para seguir explorando.',
  },
  fonts: {
    heading: 'Fraunces',
    body: 'Inter',
    mono: 'JetBrains Mono',
  },
  legal: {
    legalName: 'Grano Café S.A.S.',
    taxId: '901.000.000-1',
  },
  popups: [],
});

const shippingOptions = [
  {
    name: 'Envío nacional',
    description: 'Tostamos los martes y jueves. Despachamos en 2 a 4 días hábiles.',
    price: 12_000,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    freeShippingThreshold: 90_000,
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: 'Retiro en cafetería',
    description: 'Calle 85 # 12-34, Bogotá. Te avisamos cuando esté listo.',
    price: 0,
    estimatedDaysMin: 1,
    estimatedDaysMax: 1,
    freeShippingThreshold: null,
    isDefault: false,
    sortOrder: 1,
  },
];

async function ensureCatalogAsset(url: string) {
  const existing = await prisma.asset.findFirst({
    where: { objectKey: url, purpose: AssetPurpose.CATALOG_IMAGE },
  });
  if (existing) return existing;

  return prisma.asset.create({
    data: {
      purpose: AssetPurpose.CATALOG_IMAGE,
      bucket: 'external',
      objectKey: url,
      mimeType: 'image/jpeg',
      size: 0,
    },
  });
}

async function main() {
  console.log(`\n▶ Preparando Grano en ${databaseName}…\n`);

  const admin = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
  });

  const categoryBySlug = new Map<string, { id: string }>();
  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
        sortOrder: category.sortOrder,
      },
    });
    categoryBySlug.set(category.slug, record);
  }
  console.log(`✔ ${categories.length} categorías`);

  const pageBySlug = new Map<string, { id: string }>();
  for (const page of pages) {
    const record = await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        isVisible: true,
        sortOrder: page.sortOrder,
      },
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        isVisible: true,
        sortOrder: page.sortOrder,
      },
    });
    pageBySlug.set(page.slug, record);
  }
  console.log(`✔ ${pages.length} páginas`);

  for (const [index, product] of products.entries()) {
    const category = categoryBySlug.get(product.categorySlug);
    if (!category) throw new Error(`Categoría inexistente: ${product.categorySlug}`);

    // Orden editorial: Etiopía primero y Vasos al final. El catálogo ordena
    // por createdAt desc, así que los primeros de la lista son los más nuevos.
    const createdAt = new Date(Date.now() - index * 60_000);

    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        metaTitle: `${product.name} — Grano`,
        metaDescription: product.description.slice(0, 160),
        categoryId: category.id,
        basePrice: product.basePrice,
        isActive: true,
        createdAt,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        metaTitle: `${product.name} — Grano`,
        metaDescription: product.description.slice(0, 160),
        categoryId: category.id,
        basePrice: product.basePrice,
        isActive: true,
        createdAt,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: record.id } });
    const asset = await ensureCatalogAsset(product.image);
    await prisma.productImage.create({
      data: { productId: record.id, assetId: asset.id, sortOrder: 0 },
    });

    for (const variant of product.variants) {
      const stockMode = variant.stockMode ?? StockMode.MADE_TO_ORDER;
      const saved = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: record.id,
          size: variant.size,
          color: null,
          garmentType: null,
          stockMode,
          productionLeadTimeDays: variant.productionLeadTimeDays ?? 2,
          priceAdjustment: variant.priceAdjustment ?? null,
          lowStockThreshold: 5,
          isActive: true,
        },
        create: {
          productId: record.id,
          sku: variant.sku,
          size: variant.size,
          stockMode,
          productionLeadTimeDays: variant.productionLeadTimeDays ?? 2,
          priceAdjustment: variant.priceAdjustment ?? null,
          lowStockThreshold: 5,
          isActive: true,
        },
      });

      if (stockMode === StockMode.TRACKED) {
        await prisma.inventory.upsert({
          where: { productVariantId: saved.id },
          update: { quantity: variant.stock ?? 0 },
          create: { productVariantId: saved.id, quantity: variant.stock ?? 0 },
        });
      }
    }
  }
  console.log(`✔ ${products.length} productos con variantes e imágenes`);

  for (const option of shippingOptions) {
    const existing = await prisma.shippingOption.findFirst({ where: { name: option.name } });
    if (existing) {
      await prisma.shippingOption.update({ where: { id: existing.id }, data: option });
    } else {
      await prisma.shippingOption.create({ data: option });
    }
  }
  console.log(`✔ ${shippingOptions.length} opciones de envío`);

  const termsPage = pageBySlug.get('terminos-y-condiciones');
  if (!termsPage) throw new Error('No se creó la página de términos');

  const configData = {
    name: 'Grano',
    description:
      'Café de especialidad tostado en pequeños lotes. Origen, métodos y suscripciones para disfrutar en casa.',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#1F1B16',
    secondaryColor: '#6F7A4E',
    backgroundColor: '#FCF9F8',
    textColor: '#1F1B16',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#F4EFE7',
    borderColor: '#DCD2C4',
    errorColor: '#B42318',
    successColor: '#3F6B4A',
    warningColor: '#B7791F',
    darkBackgroundColor: '#1F1B16',
    darkTextColor: '#FCF9F8',
    appearanceMode: AppearanceMode.LIGHT,
    heroImageUrl: HERO_IMAGE,
    heroTitle: 'Café de origen',
    heroSubtitle:
      'Granos seleccionados de fincas colombianas y latinoamericanas, tostados en pequeños lotes en nuestra cafetería de Bogotá.',
    contactEmail: 'hola@grano.cafe',
    contactPhone: '+57 320 000 0000',
    socialLinks: {
      instagram: 'https://instagram.com/grano.cafe',
      tiktok: 'https://tiktok.com/@grano.cafe',
    },
    currencyCode: 'COP',
    maintenanceMode: false,
    maintenanceMessage: null,
    enableCustomDesigns: false,
    enableNewsletter: true,
    enableCatalogFilters: true,
    template: 'storefront',
    templateConfig: templateConfig as unknown as Prisma.InputJsonValue,
    storefrontConfig: storefrontConfig as unknown as Prisma.InputJsonValue,
    termsPageId: termsPage.id,
    termsVersion: 1,
    minOrderAmount: null,
    productionEstimateDays: 2,
    deliveryEstimateDays: 3,
    emailSenderName: 'Grano Café',
    emailSenderAddress: 'hola@grano.cafe',
    shippingProvider: 'freeThreshold',
    shippingBaseCost: 12_000,
    freeShippingThreshold: 90_000,
    isActive: true,
    updatedById: admin?.id ?? null,
  };

  const activeConfig = await prisma.storeConfig.findFirst({ where: { isActive: true } });
  if (activeConfig) {
    await prisma.storeConfig.update({ where: { id: activeConfig.id }, data: configData });
  } else {
    const anyConfig = await prisma.storeConfig.findFirst();
    if (anyConfig) {
      await prisma.storeConfig.update({
        where: { id: anyConfig.id },
        data: { ...configData, isActive: true },
      });
    } else {
      await prisma.storeConfig.create({ data: configData });
    }
  }
  console.log('✔ Store config: marca, colores, Fraunces y home editorial');
  console.log('\nGrano listo. Abrí http://demo.localhost:3000\n');
}

main()
  .catch((error) => {
    console.error('✖ No se pudo preparar la demo:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
