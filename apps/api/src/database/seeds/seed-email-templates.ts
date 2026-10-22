import { PrismaClient } from '@prisma/client';

import { DEFAULT_EMAIL_TEMPLATES } from '../../email/templates/default-templates';

const prisma = new PrismaClient();

/**
 * Crea en DB las plantillas de email por defecto. No sobrescribe plantillas
 * ya personalizadas desde el admin (solo crea las que falten).
 */
async function main() {
  let created = 0;

  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key: template.key } });
    if (existing) {
      continue;
    }

    await prisma.emailTemplate.create({
      data: {
        key: template.key,
        name: template.name,
        description: template.description,
        subject: template.subject,
        html: template.html,
        enabled: true,
      },
    });
    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Email templates seeded (${created} created, ${DEFAULT_EMAIL_TEMPLATES.length - created} already existed)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
