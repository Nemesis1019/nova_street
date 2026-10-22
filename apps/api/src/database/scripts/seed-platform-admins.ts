/**
 * Registra como PlatformUser (superadmins transversales) a los administradores
 * existentes del tenant por defecto, copiando su hash de contraseña para que
 * las MISMAS credenciales funcionen en el login de plataforma. Deja solo esas
 * cuentas como operadores de plataforma.
 *
 * Uso:
 *   doppler run -- ts-node src/database/scripts/seed-platform-admins.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaClient as MasterPrismaClient } from '@prisma/master-client';

const EMAILS = ['admin@tienda.com', 'admin2@tienda.com'];

async function main() {
  const tenant = new PrismaClient();
  const master = new MasterPrismaClient();

  try {
    for (const email of EMAILS) {
      const user = await tenant.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error(`No existe ${email} en el tenant por defecto`);
      }

      const name = `${user.firstName} ${user.lastName}`.trim() || email;
      await master.platformUser.upsert({
        where: { email },
        update: {
          name,
          passwordHash: user.passwordHash,
          role: 'OWNER',
          isActive: true,
        },
        create: {
          email,
          name,
          passwordHash: user.passwordHash,
          role: 'OWNER',
        },
      });
      console.log(`✔ PlatformUser ${email} (mismas credenciales del tenant)`);
    }

    // Solo estos dos operadores de plataforma.
    const removed = await master.platformUser.deleteMany({
      where: { email: { notIn: EMAILS } },
    });
    if (removed.count > 0) {
      console.log(`✔ Eliminados ${removed.count} PlatformUser(s) extra`);
    }

    const users = await master.platformUser.findMany({ select: { email: true, role: true } });
    console.log('\nOperadores de plataforma:');
    for (const user of users) console.log(`  ${user.email} (${user.role})`);
  } finally {
    await tenant.$disconnect();
    await master.$disconnect();
  }
}

void main().catch((error) => {
  console.error('✖ Error configurando superadmins:', error);
  process.exit(1);
});
