/**
 * Crea/actualiza el primer operador de plataforma (OWNER) en la BD maestra.
 *
 * Uso:
 *   doppler run -- ts-node src/database/scripts/seed-platform-owner.ts \
 *     --email=owner@nova.app --password='Owner12345678' --name="Platform Owner"
 */
import { PrismaClient as MasterPrismaClient } from '@prisma/master-client';
import * as argon2 from 'argon2';

function parseArgs(argv: string[]) {
  const values = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    if (key) values.set(key, rest.join('='));
  }
  return values;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.get('email') ?? 'owner@nova.app').trim().toLowerCase();
  const password = args.get('password') ?? 'Owner12345678';
  const name = args.get('name') ?? 'Platform Owner';

  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  const master = new MasterPrismaClient();
  try {
    const user = await master.platformUser.upsert({
      where: { email },
      update: {
        name,
        passwordHash: await argon2.hash(password),
        role: 'OWNER',
        isActive: true,
      },
      create: {
        email,
        name,
        passwordHash: await argon2.hash(password),
        role: 'OWNER',
      },
    });

    console.log('✔ Operador de plataforma listo');
    console.log(`  email: ${user.email}`);
    console.log(`  rol:   ${user.role}`);
    console.log('  2FA:   desactivado (configurable por API en /platform/auth/2fa/setup)');
  } finally {
    await master.$disconnect();
  }
}

void main().catch((error) => {
  console.error('✖ Error creando el operador:', error);
  process.exit(1);
});
