import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const domain = process.env.APP_DOMAIN || 'depedidos.com';

async function main() {
  console.log('Creando ciudad Oruro...');
  
  const oruroCity = {
    name: 'Oruro',
    country: 'Bolivia',
    currency: 'BOB',
    lat: -17.9647,
    lng: -67.1060,
    base_delivery_fee: 10.00
  };

  const center_lat_lng = `${oruroCity.lat},${oruroCity.lng}`;
  const minLng = oruroCity.lng - 0.15;
  const maxLng = oruroCity.lng + 0.15;
  const minLat = oruroCity.lat - 0.15;
  const maxLat = oruroCity.lat + 0.15;
  const wkt = `MULTIPOLYGON(((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat})))`;

  await prisma.$executeRawUnsafe(`
    INSERT INTO cities (name, country, currency, is_active, base_delivery_fee, center_lat_lng, coverage_area, created_at, updated_at)
    VALUES ($1, $2, $3, true, $4, $5, ST_GeomFromText($6, 4326), NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET
      country = EXCLUDED.country,
      currency = EXCLUDED.currency,
      base_delivery_fee = EXCLUDED.base_delivery_fee,
      center_lat_lng = EXCLUDED.center_lat_lng,
      coverage_area = EXCLUDED.coverage_area,
      updated_at = NOW();
  `, oruroCity.name, oruroCity.country, oruroCity.currency, oruroCity.base_delivery_fee, center_lat_lng, wkt);

  const driverPin = await bcrypt.hash('1234', 10);
  const adminPin = await bcrypt.hash('4321', 10);

  console.log('Creando usuarios...');

  // Carlos Mamani — driver
  await prisma.user.upsert({
    where: { phone: '+59167239563' },
    update: {},
    create: {
      name: 'Carlos Mamani',
      email: `carlos@${domain}`,
      phone: '+59167239563',
      pin: driverPin,
      transport_type: 'motorcycle',
      role: 'driver',
      points: 0,
    },
  });

  // Juan Perez — admin
  await prisma.user.upsert({
    where: { phone: '+59160427039' },
    update: {},
    create: {
      name: 'Juan Perez',
      email: `juan@${domain}`,
      phone: '+59160427039',
      pin: adminPin,
      transport_type: 'motorcycle',
      role: 'admin',
      points: 0,
    },
  });

  console.log('Seeding terminado: Ciudad Oruro y usuarios creados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
