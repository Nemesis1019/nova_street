import { PrismaClient } from '@prisma/client';

import { ALL_PERMISSIONS, Permission } from '../../auth/permissions';

const prisma = new PrismaClient();

/**
 * Roles base del sistema.
 *
 * - SUPER_ADMIN: control total, incluye `providers:*` (API keys de pasarelas,
 *   email, OAuth y credenciales de carriers).
 * - ADMIN: todo excepto la configuración de proveedores/API keys.
 * - CUSTOMER: sin permisos de panel.
 */
async function main() {
  const providerPermissions: Permission[] = [Permission.PROVIDERS_READ, Permission.PROVIDERS_WRITE];
  const adminPermissions = ALL_PERMISSIONS.filter((permission) => !providerPermissions.includes(permission));

  const baseRoles = [
    {
      name: 'CUSTOMER',
      description: 'Customer role',
      permissions: [],
    },
    {
      name: 'SUPER_ADMIN',
      description: 'Super administrador con control total (incluye proveedores y API keys)',
      permissions: ALL_PERMISSIONS,
    },
    {
      name: 'ADMIN',
      description: 'Administrador con acceso completo salvo proveedores y API keys',
      permissions: adminPermissions,
    },
  ];

  for (const role of baseRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
  }

  // eslint-disable-next-line no-console
  console.log('Roles seeded: CUSTOMER, SUPER_ADMIN, ADMIN');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
