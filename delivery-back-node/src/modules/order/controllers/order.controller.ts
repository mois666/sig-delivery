import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import axios from 'axios';
import { PricingService } from '../services/pricing.service';

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

  /**
   * POST /api/orders/calculate-fee
   * Calcula la tarifa de delivery sin crear la orden.
   * Útil para mostrar un preview de precio en el frontend antes de confirmar.
   *
   * Body: { pickup: "lat,lng", delivery: "lat,lng", city_id: number }
   * Response: PricingDetails completo
   */
  static async calculateFee(req: Request, res: Response) {
    const { pickup, delivery, city_id } = req.body;

    if (!pickup || !delivery || !city_id) {
      return res.status(400).json({
        message: 'Se requieren pickup, delivery y city_id',
      });
    }

    const [pLatStr, pLngStr] = String(pickup).split(',');
    const [dLatStr, dLngStr] = String(delivery).split(',');
    const pickupLat   = parseFloat(pLatStr?.trim());
    const pickupLng   = parseFloat(pLngStr?.trim());
    const deliveryLat = parseFloat(dLatStr?.trim());
    const deliveryLng = parseFloat(dLngStr?.trim());

    if (
      isNaN(pickupLat) || isNaN(pickupLng) ||
      isNaN(deliveryLat) || isNaN(deliveryLng)
    ) {
      return res.status(400).json({ message: 'Coordenadas inválidas' });
    }

    try {
      const pricing = await PricingService.calculateDeliveryFee(
        pickupLat, pickupLng,
        deliveryLat, deliveryLng,
        Number(city_id)
      );

      return res.json(pricing);
    } catch (error: any) {
      console.error('[OrderController.calculateFee]', error);
      return res.status(500).json({
        message: 'Error al calcular tarifa',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/orders
   * Crea una nueva orden calculando la tarifa con PricingService.
   */
  static async store(req: Request, res: Response) {
    const data = req.body;
    const io = (req as any).io;

    try {
      const cityId = Number(data.city_id);
      const city = await prisma.city.findUnique({ where: { id: cityId } });

      if (!city) {
        return res.status(400).json({ message: 'La ciudad especificada no existe' });
      }

      // Copy currency from city
      data.currency = city.currency || 'BOB';

      let pickupLat = 0,  pickupLng = 0;
      let deliveryLat = 0, deliveryLng = 0;
      let pricingDetails: any = null;

      // ── Calcular precio con PricingService ──────────────────────────────────
      if (
        data.pickup   && typeof data.pickup   === 'string' && data.pickup.includes(',') &&
        data.delivery && typeof data.delivery === 'string' && data.delivery.includes(',')
      ) {
        const [pLatStr, pLngStr] = data.pickup.split(',');
        pickupLat  = parseFloat(pLatStr.trim());
        pickupLng  = parseFloat(pLngStr.trim());

        const [dLatStr, dLngStr] = data.delivery.split(',');
        deliveryLat = parseFloat(dLatStr.trim());
        deliveryLng = parseFloat(dLngStr.trim());

        if (!isNaN(pickupLat) && !isNaN(pickupLng) && !isNaN(deliveryLat) && !isNaN(deliveryLng)) {
          try {
            pricingDetails = await PricingService.calculateDeliveryFee(
              pickupLat,  pickupLng,
              deliveryLat, deliveryLng,
              cityId
            );

            data.delivery_fee = pricingDetails.total_delivery_fee;
          } catch (pricingErr) {
            console.error('[OrderController.store] PricingService falló:', pricingErr);
            // Fallback: usar tarifa base de la ciudad
            data.delivery_fee = Number(city.base_delivery_fee);
          }
        }
      }

      // Si no se calculó pricing, usar tarifa enviada o base de ciudad
      if (!data.delivery_fee) {
        data.delivery_fee = Number(city.base_delivery_fee);
      }

      // ── Puntos y duración ───────────────────────────────────────────────────
      const totalDistanceKm = pricingDetails?.total_distance_km ?? 0;
      data.points = Math.round(totalDistanceKm * 10);

      const durationSeconds  = pricingDetails?.duration_seconds ?? 0;
      const travelTimeMinutes = durationSeconds > 0
        ? Math.round(durationSeconds / 60) + 2
        : Math.round((totalDistanceKm / 30) * 60) + 5;

      data.duration = `${travelTimeMinutes} mins`;

      // ── Delivery time ───────────────────────────────────────────────────────
      if (data.type === 'estandar') {
        data.delivery_time = new Date(Date.now() + travelTimeMinutes * 60 * 1000);
      } else {
        data.delivery_time = data.delivery_time ? new Date(data.delivery_time) : new Date();
      }

      const formatDateTime = (date: Date): string => {
        const yyyy = date.getFullYear();
        const mm   = String(date.getMonth() + 1).padStart(2, '0');
        const dd   = String(date.getDate()).padStart(2, '0');
        const hh   = String(date.getHours()).padStart(2, '0');
        const min  = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      };
      const formattedDeliveryTime = formatDateTime(data.delivery_time);

      // ── Geocoding inverso (Nominatim) para address_metadata ─────────────────
      let city_name        = city.name;
      let country_name     = city.country || 'Bolivia';
      let formatted_address = data.address_b || 'Avenida Cívica, Oruro, Bolivia';

      if (deliveryLat !== 0 && deliveryLng !== 0) {
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${deliveryLat}&lon=${deliveryLng}&format=json`,
            { headers: { 'User-Agent': 'DepedidosDeliveryApp/1.0 (acolque@depedidos.com)' } }
          );
          if (response.data?.address) {
            const geoData = response.data;
            city_name        = geoData.address.city || geoData.address.town || geoData.address.village || city_name;
            country_name     = geoData.address.country || country_name;
            formatted_address = geoData.display_name || formatted_address;
          }
        } catch (fetchErr) {
          console.error('[OrderController.store] Nominatim error:', fetchErr);
        }
      }

      data.address_metadata = {
        city_name,
        country_name,
        formatted_address,
        pickup:        { lat: pickupLat,   lng: pickupLng   },
        delivery:      { lat: deliveryLat, lng: deliveryLng },
        address_a:     data.address_a || '',
        address_b:     data.address_b || '',
        delivery_time: formattedDeliveryTime,
        delivery_fee:  data.delivery_fee,
      };

      // ── Persistir orden ─────────────────────────────────────────────────────
      const order = await prisma.order.create({
        data: {
          type:            data.type,
          client_name:     data.client_name,
          pickup:          data.pickup,
          delivery:        data.delivery,
          address_a:       data.address_a       || null,
          address_b:       data.address_b       || null,
          delivery_time:   data.delivery_time,
          delivery_fee:    data.delivery_fee,
          description:     data.description     || null,
          currency:        data.currency        || 'BOB',
          status:          data.status          || 'pending',
          duration:        data.duration        || null,
          points:          data.points          || 0,
          city_id:         data.city_id,
          address_metadata: data.address_metadata || {},
          // Guardar snapshot del cálculo geoespacial (sin la geometría para no inflar el JSON)
          pricing_details: pricingDetails
            ? {
                base_fee:           pricingDetails.base_fee,
                total_distance_km:  pricingDetails.total_distance_km,
                normal_distance_km: pricingDetails.normal_distance_km,
                normal_cost:        pricingDetails.normal_cost,
                zones:              pricingDetails.zones,
                total_delivery_fee: pricingDetails.total_delivery_fee,
                duration_seconds:   pricingDetails.duration_seconds,
              }
            : undefined,
        },
      });

      if (io) io.emit('order_published', order);

      return res.status(201).json({
        message: '¡Reto logístico publicado!',
        order,
      });
    } catch (error: any) {
      console.error('[OrderController.store]', error);
      return res.status(500).json({ message: 'Error al crear pedido', error: error.message });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener pedido' });
    }
  }

  static async update(req: Request, res: Response) {
    const id   = parseInt(req.params.id as string);
    const data = req.body;
    try {
      const order = await prisma.order.update({ where: { id }, data });
      return res.json({ message: 'Pedido actualizado correctamente', order });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar pedido' });
    }
  }

  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const io = (req as any).io;
    try {
      const order = await prisma.order.delete({ where: { id } });
      if (io) io.emit('order_deleted', order);
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
          data:  { status: 'assigned' },
        });
        await tx.orderAssignment.create({
          data: { order_id: id, user_id: parseInt(driver_id), status: 'accepted' },
        });
        return updatedOrder;
      });

      if (io) io.emit('order_assigned', order);
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
      const order = await prisma.order.update({ where: { id }, data: { status } });
      if (io) io.emit('order_updated', order);
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar estado del pedido' });
    }
  }

  static async complete(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const io = (req as any).io;
    try {
      const order = await prisma.order.update({ where: { id }, data: { status: 'completed' } });
      if (io) io.emit('order_completed', order);
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error al finalizar pedido' });
    }
  }
}
