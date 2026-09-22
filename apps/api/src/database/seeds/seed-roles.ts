import { PrismaClient } from '@prisma/client';

import { ALL_PERMISSIONS } from '../../auth/permissions';

const prisma = new PrismaClient();

async function main() {
  const baseRoles = [
    {
      name: 'CUSTOMER',
      description: 'Customer role',
      permissions: [],
    },
    {
      name: 'ADMIN',
      description: 'Administrator with full access',
      permissions: ALL_PERMISSIONS,
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
  console.log('Roles seeded');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
