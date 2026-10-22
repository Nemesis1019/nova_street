/**
 * Alta de un cliente (tenant) nuevo en la plataforma desde la CLI:
 *   1. Crea la base de datos Postgres del cliente.
 *   2. Aplica las migraciones del esquema de tienda (`prisma migrate deploy`).
 *   3. Siembra roles (CUSTOMER/ADMIN/SUPER_ADMIN) y la configuración inicial.
 *   4. Crea el usuario admin del cliente.
 *   5. Registra el tenant + dominio en la BD maestra.
 *
 * La misma lógica la usa el panel de plataforma (`POST /platform/tenants`).
 *
 * Uso:
 *   doppler run -- ts-node src/database/scripts/create-tenant.ts \
 *     --slug=demo --name="Tienda Demo" --domain=demo.localhost \
 *     --admin-email=admin@demo.test --admin-password=Demo12345678
 *
 * Opcional: `--database-url=postgresql://...` para usar una BD existente
 * (en ese caso no se crea la BD, solo se migra/seedea).
 */
import { PrismaClient as MasterPrismaClient } from '@prisma/master-client';

import {
  buildTenantDatabaseUrl,
  provisionTenant,
  registerTenant,
} from '../../platform/provisioning';

interface Args {
  slug: string;
  name: string;
  domain?: string;
  databaseUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    if (key) values.set(key, rest.join('='));
  }

  const slug = values.get('slug')?.trim().toLowerCase();
  if (!slug) throw new Error('Falta --slug');

  return {
    slug,
    name: values.get('name') ?? slug,
    domain: values.get('domain') ?? `${slug}.localhost`,
    databaseUrl: values.get('database-url'),
    adminEmail: values.get('admin-email'),
    adminPassword: values.get('admin-password'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const masterUrl = process.env.MASTER_DATABASE_URL;
  if (!masterUrl) throw new Error('Falta MASTER_DATABASE_URL');

  const databaseUrl = args.databaseUrl || buildTenantDatabaseUrl(masterUrl, args.slug);
  const master = new MasterPrismaClient();

  try {
    console.log(`→ Provisionando cliente "${args.slug}"...`);
    await provisionTenant({
      master,
      slug: args.slug,
      name: args.name,
      databaseUrl,
      adminEmail: args.adminEmail,
      adminPassword: args.adminPassword,
      createDatabase: !args.databaseUrl,
    });

    console.log('→ Registrando tenant en la BD maestra...');
    await registerTenant(master, {
      slug: args.slug,
      name: args.name,
      databaseUrl,
      domain: args.domain,
    });

    console.log('\n✔ Tenant creado');
    console.log(`  slug:     ${args.slug}`);
    console.log(`  dominio:  ${args.domain ?? '-'}`);
    console.log(`  BD:       ${databaseUrl.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@')}`);
    if (args.adminEmail) console.log(`  admin:    ${args.adminEmail}`);
  } finally {
    await master.$disconnect();
  }
}

void main().catch((error) => {
  console.error('✖ Error creando el tenant:', error);
  process.exit(1);
});
