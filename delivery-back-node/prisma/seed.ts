import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CITIES = [
  { name: 'Oruro',       country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'La Paz',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Cochabamba',  country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Santa Cruz',  country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Potosí',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Sucre',       country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Tarija',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Trinidad',    country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Beni',        country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
  { name: 'Cobija',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', coordinates: [] },
];

async function main() {
  console.log('🌆 Creando ciudades...');

  // Crear ciudades una a una con upsert para evitar duplicados
  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: {},
      create: city,
    });
  }

  // Obtener ID de Oruro para los usuarios seed
  const oruro = await prisma.city.findUnique({ where: { name: 'Oruro' } });
  if (!oruro) throw new Error('Ciudad Oruro no encontrada tras el seed');

  const driverPin = await bcrypt.hash('1234', 10);
  const adminPin  = await bcrypt.hash('4321', 10);

  console.log('👤 Creando usuarios...');

  // Carlos Mamani — driver
  await prisma.user.upsert({
    where: { phone: '+59167239563' },
    update: {},
    create: {
      name:           'Carlos Mamani',
      email:          'carlos@drivecore.com',
      phone:          '+59167239563',
      pin:            driverPin,
      transport_type: 'motorcycle',
      role:           'driver',
      points:         0,
    },
  });

  // Juan Perez — admin
  await prisma.user.upsert({
    where: { phone: '+59160427039' },
    update: {},
    create: {
      name:           'Juan Perez',
      email:          'juan@drivecore.com',
      phone:          '+59160427039',
      pin:            adminPin,
      transport_type: 'motorcycle',
      role:           'admin',
      points:         0,
    },
  });

  console.log('✅ Seeding terminado: Ciudades y usuarios creados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
