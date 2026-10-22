import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaClient as MasterPrismaClient } from '@prisma/master-client';
import * as argon2 from 'argon2';

import { encryptSecret } from '../tenant/crypto.util';

export interface ProvisionTenantInput {
  master: MasterPrismaClient;
  slug: string;
  name: string;
  databaseUrl: string;
  adminEmail?: string;
  adminPassword?: string;
  /** Si la BD no existe todavía, se crea (`tenant_<slug>`). */
  createDatabase?: boolean;
}

/** URL de la BD del cliente derivada de la maestra (mismo servidor Postgres). */
export function buildTenantDatabaseUrl(masterUrl: string, slug: string): string {
  const url = new URL(masterUrl);
  url.pathname = `/tenant_${slug}`;
  return url.toString();
}

export function runTenantMigrations(databaseUrl: string): void {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}

/** Nombre de la última migración aplicada en la BD de un cliente. */
export async function latestMigrationName(databaseUrl: string): Promise<string | null> {
  const client = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const rows = await client.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    return rows[0]?.migration_name ?? null;
  } finally {
    await client.$disconnect();
  }
}

/**
 * Alta completa de un cliente: BD (opcional), migraciones, roles, config
 * inicial y admin. Usada por el panel de plataforma y por el CLI.
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<void> {
  const { master, slug, name, databaseUrl, adminEmail, adminPassword, createDatabase } = input;

  if (createDatabase) {
    await master.$executeRawUnsafe(`CREATE DATABASE "tenant_${slug}"`).catch((error) => {
      if (String(error).includes('already exists')) return;
      throw error;
    });
  }

  runTenantMigrations(databaseUrl);

  execFileSync('npx', ['ts-node', 'src/database/seeds/seed-roles.ts'], {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  const tenant = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const existingConfig = await tenant.storeConfig.findFirst();
    if (!existingConfig) {
      await tenant.storeConfig.create({ data: buildInitialStoreConfig(name) });
    }

    if (adminEmail && adminPassword) {
      // El admin de la tienda usa el rol ADMIN (todo salvo proveedores/API keys).
      // Los superadmins transversales son PlatformUser + espejo SUPER_ADMIN.
      const role =
        (await tenant.role.findFirst({ where: { name: 'ADMIN' } })) ??
        (await tenant.role.findFirst({ where: { name: 'SUPER_ADMIN' } }));
      if (!role) throw new Error('No se encontró el rol ADMIN (¿falló el seed de roles?)');

      const passwordHash = await argon2.hash(adminPassword);
      await tenant.user.upsert({
        where: { email: adminEmail },
        update: { passwordHash, roleId: role.id },
        create: {
          email: adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: name,
          emailVerified: true,
          isActive: true,
          roleId: role.id,
        },
      });
    }
  } finally {
    await tenant.$disconnect();
  }
}

function buildInitialStoreConfig(name: string) {
  return {
    name,
    description: `Bienvenidos a ${name}`,
    primaryColor: '#0d0d0d',
    secondaryColor: '#5f5f58',
    backgroundColor: '#fcf9f8',
    textColor: '#1b1c1c',
    currencyCode: 'COP',
    appearanceMode: 'LIGHT' as const,
    surfaceColor: '#ffffff',
    surfaceMutedColor: '#f6f3f2',
    borderColor: '#0d0d0d',
    errorColor: '#e03131',
    successColor: '#2f9e44',
    warningColor: '#f76707',
    darkBackgroundColor: '#0d0d0d',
    darkTextColor: '#f5f5f5',
    maintenanceMode: false,
    enableCustomDesigns: true,
    enableNewsletter: true,
    enableCatalogFilters: true,
    template: 'storefront',
    templateConfig: {},
    storefrontConfig: {},
    emailProvider: 'smtp',
    paymentProvider: 'stripe',
    shippingProvider: 'flatRate',
    shippingBaseCost: 10_000,
    termsVersion: 1,
    googleOAuthEnabled: false,
    appleOAuthEnabled: false,
  };
}

/** Registra el tenant en la BD maestra con la URL cifrada. */
export async function registerTenant(
  master: MasterPrismaClient,
  data: { slug: string; name: string; databaseUrl: string; domain?: string },
) {
  return master.tenant.upsert({
    where: { slug: data.slug },
    update: { name: data.name, databaseUrl: encryptSecret(data.databaseUrl) },
    create: {
      slug: data.slug,
      name: data.name,
      databaseUrl: encryptSecret(data.databaseUrl),
      status: 'ACTIVE',
      isDefault: false,
      domains: data.domain ? { create: { host: data.domain, isPrimary: true } } : undefined,
    },
    include: { domains: true },
  });
}
