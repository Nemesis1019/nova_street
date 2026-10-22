/**
 * Cifra en reposo las credenciales existentes en StoreConfig de todos los
 * tenants (idempotente). Útil también durante una rotación de PLATFORM_SECRET:
 * 1. Configurar `PLATFORM_SECRET_PREVIOUS` con la clave vieja.
 * 2. Ejecutar este script (re-cifra con la clave actual).
 * 3. Quitar `PLATFORM_SECRET_PREVIOUS`.
 *
 * Uso: doppler run -- ts-node src/database/scripts/encrypt-tenant-secrets.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';
import { PrismaClient as MasterPrismaClient } from '@prisma/master-client';

import { decryptSecret, encryptSecret, isEncrypted } from '../../tenant/crypto.util';

const SECRET_FIELDS = [
  'boldSecretKey',
  'stripeSecretKey',
  'stripeWebhookSecret',
  'smtpPass',
  'resendApiKey',
  'shippingApiKey',
] as const;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const master = new MasterPrismaClient();
  let tenants = 0;
  let encrypted = 0;

  try {
    const rows = await master.tenant.findMany();
    for (const row of rows) {
      tenants += 1;
      const client = new PrismaClient({ datasourceUrl: decryptSecret(row.databaseUrl) });
      try {
        const configs = await client.storeConfig.findMany();
        for (const config of configs) {
          const data: Record<string, string> = {};
          for (const field of SECRET_FIELDS) {
            const value = config[field];
            if (value && !isEncrypted(value)) {
              data[field] = encryptSecret(value);
            }
          }
          if (Object.keys(data).length === 0) continue;
          encrypted += Object.keys(data).length;
          if (dryRun) {
            console.log(`  [dry-run] ${row.slug}: ${Object.keys(data).join(', ')}`);
          } else {
            await client.storeConfig.update({ where: { id: config.id }, data });
            console.log(`  ✔ ${row.slug}: ${Object.keys(data).join(', ')}`);
          }
        }
      } finally {
        await client.$disconnect();
      }
    }

    console.log(
      `\n${dryRun ? 'Detectados' : 'Cifrados'} ${encrypted} secretos en ${tenants} tenants.`,
    );
  } finally {
    await master.$disconnect();
  }
}

void main().catch((error) => {
  console.error('✖ Error cifrando secretos:', error);
  process.exit(1);
});
