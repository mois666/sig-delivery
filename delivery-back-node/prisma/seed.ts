import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const driverPin = await bcrypt.hash('1234', 10);
  const adminPin = await bcrypt.hash('4321', 10);

  // Carlos Mamani
  await prisma.user.upsert({
    where: { phone: '+59167239563' },
    update: {},
    create: {
      name: 'Carlos Mamani',
      email: 'carlos@drivecore.com',
      phone: '+59167239563',
      pin: driverPin,
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
      email: 'juan@drivecore.com',
      phone: '+59160427039',
      pin: adminPin,
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
