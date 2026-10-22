/**
 * Registra la tienda actual como primer tenant de la plataforma.
 *
 * Uso:
 *   doppler run -- ts-node src/database/scripts/register-default-tenant.ts
 *
 * Es idempotente: si el tenant ya existe, no lo modifica (solo asegura el dominio).
 */
import { PrismaClient } from '@prisma/master-client';

import { encryptSecret } from '../../tenant/crypto.util';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta DATABASE_URL (BD de la tienda actual)');

  const masterUrl = process.env.MASTER_DATABASE_URL;
  if (!masterUrl) throw new Error('Falta MASTER_DATABASE_URL (BD maestra)');

  const slug = (process.env.DEFAULT_TENANT_SLUG ?? 'nova').trim().toLowerCase();
  const name = process.env.STORE_NAME ?? 'NÖVA';

  const master = new PrismaClient();

  try {
    const tenant = await master.tenant.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        databaseUrl: encryptSecret(databaseUrl),
        isDefault: true,
        status: 'ACTIVE',
      },
    });

    const existingDefault = await master.tenant.findFirst({ where: { isDefault: true } });
    if (existingDefault && existingDefault.id !== tenant.id) {
      await master.tenant.update({ where: { id: existingDefault.id }, data: { isDefault: false } });
      await master.tenant.update({ where: { id: tenant.id }, data: { isDefault: true } });
    }

    for (const [index, host] of ['localhost', `${slug}.localhost`].entries()) {
      await master.tenantDomain.upsert({
        where: { host },
        update: { tenantId: tenant.id },
        create: { host, tenantId: tenant.id, isPrimary: index === 0 },
      });
    }

    console.log(`✔ Tenant "${slug}" registrado (id: ${tenant.id}) con dominios localhost / ${slug}.localhost`);
    console.log(`  isDefault tenant: ${(await master.tenant.findFirst({ where: { isDefault: true } }))?.slug}`);
  } finally {
    await master.$disconnect();
  }
}

void main().catch((error) => {
  console.error('✖ Error registrando el tenant:', error);
  process.exit(1);
});
