import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import axios from 'axios';

export class OrderController {
  static async index(req: Request, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
      });

      return res.json({ orders });
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener pedidos' });
    }
  }

  static async store(req: Request, res: Response) {
    const data = req.body;
    const io = (req as any).io;

    try {
      const cityId = Number(data.city_id);
      const city = await prisma.city.findUnique({
        where: { id: cityId },
      });

      if (!city) {
        return res.status(400).json({ message: 'La ciudad especificada no existe' });
      }

      // Copy currency from city
      data.currency = city.currency || 'BOB';

      let pickupLat = 0, pickupLng = 0;
      let deliveryLat = 0, deliveryLng = 0;
      let totalDistanceKm = 0;
      let zonesCrossed: any[] = [];
      let finalFee = Number(data.delivery_fee) || Number(city.base_delivery_fee);

      if (
        data.pickup && typeof data.pickup === 'string' && data.pickup.includes(',') &&
        data.delivery && typeof data.delivery === 'string' && data.delivery.includes(',')
      ) {
        const [pLatStr, pLngStr] = data.pickup.split(',');
        pickupLat = parseFloat(pLatStr.trim());
        pickupLng = parseFloat(pLngStr.trim());

        const [dLatStr, dLngStr] = data.delivery.split(',');
        deliveryLat = parseFloat(dLatStr.trim());
        deliveryLng = parseFloat(dLngStr.trim());

        if (!isNaN(pickupLat) && !isNaN(pickupLng) && !isNaN(deliveryLat) && !isNaN(deliveryLng)) {
          // Calculate distance in km geodetically using PostGIS
          const distanceRes = await prisma.$queryRaw<Array<{ distance_km: number }>>`
            SELECT ST_Distance(
              ST_SetSRID(ST_Point(${pickupLng}, ${pickupLat}), 4326)::geography,
              ST_SetSRID(ST_Point(${deliveryLng}, ${deliveryLat}), 4326)::geography
            ) / 1000.0 AS distance_km
          `;
          if (distanceRes && distanceRes[0]) {
            totalDistanceKm = Number(distanceRes[0].distance_km) || 0;
          }

          // Calculate intersection with active zones
          zonesCrossed = await prisma.$queryRaw<Array<{ id: number, name: string, extra_rate: number, km_inside: number }>>`
            SELECT 
              id, 
              name, 
              CAST(extra_rate AS double precision) AS extra_rate, 
              ST_Length(
                ST_Intersection(
                  polygon, 
                  ST_MakeLine(
                    ST_SetSRID(ST_Point(${pickupLng}, ${pickupLat}), 4326), 
                    ST_SetSRID(ST_Point(${deliveryLng}, ${deliveryLat}), 4326)
                  )
                )::geography
              ) / 1000.0 AS km_inside
            FROM zones
            WHERE city_id = ${cityId} 
              AND is_active = true 
              AND ST_Intersects(polygon, ST_MakeLine(ST_SetSRID(ST_Point(${pickupLng}, ${pickupLat}), 4326), ST_SetSRID(ST_Point(${deliveryLng}, ${deliveryLat}), 4326)))
          `;
        }
      }

      // Filter zones and apply pricing formula
      const validZones = zonesCrossed.filter(z => z.km_inside > 0.001 && z.extra_rate > 0);
      let sumZonesKm = validZones.reduce((sum, z) => sum + z.km_inside, 0);
      sumZonesKm = Math.min(sumZonesKm, totalDistanceKm); // Cap sum to total distance

      const base_delivery_fee = Number(city.base_delivery_fee);
      const remainingDistance = totalDistanceKm - sumZonesKm;
      const baseCost = remainingDistance * base_delivery_fee;
      const zoneCost = validZones.reduce((sum, z) => sum + ((z.km_inside * base_delivery_fee) / z.extra_rate), 0);

      finalFee = baseCost + zoneCost;
      finalFee = Math.round(finalFee * 100) / 100; // Round to 2 decimals

      // Minimum fee is base fee of city
      if (finalFee < base_delivery_fee) {
        finalFee = base_delivery_fee;
      }
      data.delivery_fee = finalFee;

      // Calculate points: 10 pts per km
      data.points = Math.round(totalDistanceKm * 10);

      // Estimate travel time and set delivery_time
      const travelTimeMinutes = totalDistanceKm > 0 ? Math.round((totalDistanceKm / 30.0) * 60.0) + 5 : 10;
      data.duration = `${travelTimeMinutes} mins`;

      if (data.type === 'estandar') {
        data.delivery_time = new Date(Date.now() + travelTimeMinutes * 60 * 1000);
      } else {
        data.delivery_time = data.delivery_time ? new Date(data.delivery_time) : new Date();
      }

      // Format datetime in YYYY-MM-DD HH:mm format
      const formatDateTime = (date: Date): string => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      };
      const formattedDeliveryTime = formatDateTime(data.delivery_time);

      // Fetch metadata from Nominatim for delivery address
      let city_name = city.name;
      let country_name = city.country || 'Bolivia';
      let formatted_address = data.address_b || 'Avenida Cívica, Oruro, Bolivia';

      if (deliveryLat !== 0 && deliveryLng !== 0) {
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${deliveryLat}&lon=${deliveryLng}&format=json`,
            {
              headers: {
                'User-Agent': 'DepedidosDeliveryApp/1.0 (acolque@depedidos.com)'
              }
            }
          );
          if (response.data) {
            const geoData = response.data;
            if (geoData.address) {
              city_name = geoData.address.city || geoData.address.town || geoData.address.village || city_name;
              country_name = geoData.address.country || country_name;
            }
            formatted_address = geoData.display_name || formatted_address;
          }
        } catch (fetchErr) {
          console.error('Error al consultar Nominatim para address_metadata:', fetchErr);
        }
      }

      // Save complete metadata
      data.address_metadata = {
        city_name,
        country_name,
        formatted_address,
        pickup: { lat: pickupLat, lng: pickupLng },
        delivery: { lat: deliveryLat, lng: deliveryLng },
        address_a: data.address_a || '',
        address_b: data.address_b || '',
        delivery_time: formattedDeliveryTime,
        delivery_fee: finalFee
      };

      const order = await prisma.order.create({
        data: {
          type:             data.type,
          client_name:      data.client_name,
          pickup:           data.pickup,
          delivery:         data.delivery,
          address_a:        data.address_a || null,
          address_b:        data.address_b || null,
          delivery_time:    data.delivery_time,
          delivery_fee:     data.delivery_fee,
          description:      data.description || null,
          currency:         data.currency || 'BOB',
          status:           data.status || 'pending',
          duration:         data.duration || null,
          points:           data.points || 0,
          city_id:          data.city_id,
          address_metadata: data.address_metadata || {},
        },
      });

      // Socket.io Broadcast (Equivalente a Laravel Broadcast OrderCreated)
      if (io) {
        io.emit('order_published', order);
      }

      return res.status(201).json({
        message: '¡Reto logístico publicado!',
        order,
      });
    } catch (error: any) {
      console.error('Error en OrderController.store:', error);
      return res.status(500).json({ message: 'Error al crear pedido', error: error.message });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);

    try {
      const order = await prisma.order.findUnique({ where: { id } });

      if (!order) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }

      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener pedido' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const data = req.body;

    try {
      const order = await prisma.order.update({
        where: { id },
        data,
      });

      return res.json({
        message: 'Pedido actualizado correctamente',
        order,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar pedido' });
    }
  }

  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const io = (req as any).io;

    try {
      const order = await prisma.order.delete({ where: { id } });

      // Socket.io Broadcast (Equivalente a Laravel Broadcast OrderDeleted)
      if (io) {
        io.emit('order_deleted', order);
      }

      return res.json({ message: 'Pedido eliminado' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar pedido' });
    }
  }

  static async accept(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { driver_id } = req.body;
    const io = (req as any).io;

    try {
      const order = await prisma.$transaction(async (tx: any) => {
        const existingOrder = await tx.order.findUnique({ where: { id } });
        if (!existingOrder || existingOrder.status !== 'pending') {
          throw new Error('El pedido ya no está disponible');
        }

        const updatedOrder = await tx.order.update({
          where: { id },
          data: { status: 'assigned' }
        });

        await tx.orderAssignment.create({
          data: {
            order_id: id,
            user_id: parseInt(driver_id),
            status: 'accepted'
          }
        });

        return updatedOrder;
      });

      if (io) {
        io.emit('order_assigned', order);
      }

      return res.json(order);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al aceptar pedido' });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;
    const io = (req as any).io;

    try {
      const order = await prisma.order.update({
        where: { id },
        data: { status }
      });

      if (io) {
        io.emit('order_updated', order);
      }

      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar estado del pedido' });
    }
  }

  static async complete(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const io = (req as any).io;

    try {
      const order = await prisma.order.update({
        where: { id },
        data: { status: 'completed' }
      });

      if (io) {
        io.emit('order_completed', order);
      }

      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error al finalizar pedido' });
    }
  }
}
