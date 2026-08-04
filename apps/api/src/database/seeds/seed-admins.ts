import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator' },
  });

  const admins = [
    { email: 'admin@tienda.com', password: 'Admin1234', firstName: 'Admin', lastName: 'Tienda' },
    { email: 'admin2@tienda.com', password: 'Admin2345', firstName: 'Admin', lastName: 'Secundario' },
  ];

  for (const admin of admins) {
    const passwordHash = await argon2.hash(admin.password);
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        email: admin.email,
        passwordHash,
        firstName: admin.firstName,
        lastName: admin.lastName,
        roleId: adminRole.id,
        isActive: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Admin users seeded:');
  // eslint-disable-next-line no-console
  console.log('  admin@tienda.com / Admin1234');
  // eslint-disable-next-line no-console
  console.log('  admin2@tienda.com / Admin2345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
