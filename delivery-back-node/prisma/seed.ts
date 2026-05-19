import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Carlos Mamani
  await prisma.user.upsert({
    where: { phone: '+59167239563' },
    update: {},
    create: {
      name: 'Carlos Mamani',
      phone: '+59167239563',
      pin: '1234',
      city: 'Oruro',
      role: 'driver',
      points: 0,
    },
  });

  // Juan Perez
  await prisma.user.upsert({
    where: { phone: '+59160427039' },
    update: {},
    create: {
      name: 'Juan Perez',
      phone: '+59160427039',
      pin: '4321',
      city: 'Oruro',
      role: 'admin',
      points: 0,
    },
  });

  console.log('Seeding terminado: Usuarios creados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
