import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CITIES = [
  { name: 'Oruro',       country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -17.9647, center_lng: -67.1060 },
  { name: 'La Paz',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -16.4897, center_lng: -68.1193 },
  { name: 'Cochabamba',  country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -17.3895, center_lng: -66.1568 },
  { name: 'Santa Cruz',  country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -17.7834, center_lng: -63.1821 },
  { name: 'Potosí',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -19.5723, center_lng: -65.7550 },
  { name: 'Sucre',       country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -19.0196, center_lng: -65.2619 },
  { name: 'Tarija',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -21.5353, center_lng: -64.7296 },
  { name: 'Trinidad',    country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -14.8348, center_lng: -64.9043 },
  { name: 'Beni',        country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -14.2785, center_lng: -65.2783 },
  { name: 'Cobija',      country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', center_lat: -11.0298, center_lng: -68.7695 },
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
