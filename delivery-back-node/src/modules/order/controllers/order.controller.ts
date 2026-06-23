import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import axios from 'axios';
import { PricingService, CoverageError } from '../services/pricing.service';

export class OrderController {
  static async index(req: Request, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
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
    const pickupLat = parseFloat(pLatStr?.trim());
    const pickupLng = parseFloat(pLngStr?.trim());
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
      if (error instanceof CoverageError) {
        return res.status(400).json({ message: error.message, code: 'COVERAGE_ERROR' });
      }
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

      let pickupLat = 0, pickupLng = 0;
      let deliveryLat = 0, deliveryLng = 0;
      let pricingDetails: any = null;

      // ── Calcular precio con PricingService ──────────────────────────────────
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
          try {
            pricingDetails = await PricingService.calculateDeliveryFee(
              pickupLat, pickupLng,
              deliveryLat, deliveryLng,
              cityId
            );

            data.delivery_fee = pricingDetails.total_delivery_fee;
          } catch (pricingErr: any) {
            if (pricingErr instanceof CoverageError) {
              return res.status(400).json({ message: pricingErr.message, code: 'COVERAGE_ERROR' });
            }
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
      const totalDistanceKm = pricingDetails?.route_distance_km ?? 0;
      data.reward_points = Math.round(totalDistanceKm * 10);

      const durationSeconds = pricingDetails?.duration_seconds ?? 0;
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
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      };
      const formattedDeliveryTime = formatDateTime(data.delivery_time);

      // ── Geocoding inverso (Nominatim) para address_metadata ─────────────────
      let city_name = city.name;
      let country_name = city.country || 'Bolivia';
      let formatted_address = data.address_b || 'Avenida Cívica, Oruro, Bolivia';

      if (deliveryLat !== 0 && deliveryLng !== 0) {
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${deliveryLat}&lon=${deliveryLng}&format=json`,
            { headers: { 'User-Agent': 'DepedidosDeliveryApp/1.0 (acolque@depedidos.com)' } }
          );
          if (response.data?.address) {
            const geoData = response.data;
            city_name = geoData.address.city || geoData.address.town || geoData.address.village || city_name;
            country_name = geoData.address.country || country_name;
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
        pickup: { lat: pickupLat, lng: pickupLng },
        delivery: { lat: deliveryLat, lng: deliveryLng },
        address_a: data.address_a || '',
        address_b: data.address_b || '',
        delivery_time: formattedDeliveryTime,
        delivery_fee: data.delivery_fee,
        // ── Datos de ruta (OSRM + PricingService) ───────────────────────────
        route_distance_km: pricingDetails?.route_distance_km ?? null,
        total_distance_km: pricingDetails?.route_distance_km ?? null,
        normal_distance_km: pricingDetails?.normal_distance_km ?? null,
        normal_cost: pricingDetails?.normal_cost ?? null,
        duration_seconds: pricingDetails?.duration_seconds ?? null,
        duration: data.duration || null,
        base_fee: pricingDetails?.base_fee ?? null,
        zones: pricingDetails?.zones ?? [],
        total_delivery_fee: pricingDetails?.total_delivery_fee ?? data.delivery_fee,
        route_geometry: pricingDetails?.route_geometry ?? null,
      };

      // ── Persistir orden ─────────────────────────────────────────────────────
      // El campo route_geometry es un tipo PostGIS nativo (Unsupported en Prisma),
      // por lo que se guarda usando SQL raw para poder pasar el WKT correctamente.
      const routeWKT = pricingDetails?.route_geometry_wkt ?? null;

      const pricingSnapshot = pricingDetails
        ? {
          route_distance_km: pricingDetails.route_distance_km,
          total_distance_km: pricingDetails.route_distance_km,
          base_fee: pricingDetails.base_fee,
          normal_distance_km: pricingDetails.normal_distance_km,
          normal_cost: pricingDetails.normal_cost,
          zones: pricingDetails.zones,
          total_delivery_fee: pricingDetails.total_delivery_fee,
          duration_seconds: pricingDetails.duration_seconds,
          route_geometry: pricingDetails.route_geometry,
        }
        : null;

      let order: any;

      if (routeWKT) {
        // Insertar con geometría de ruta vía SQL raw
        const inserted = await prisma.$queryRaw<Array<{ id: number }>>`
          INSERT INTO orders (
            type, client_name, pickup, delivery,
            address_a, address_b, delivery_time, delivery_fee,
            description, currency, status, duration, reward_points,
            city_id, address_metadata, pricing_details,
            route_geometry, created_at, updated_at
          ) VALUES (
            ${data.type}, ${data.client_name}, ${data.pickup}, ${data.delivery},
            ${data.address_a || null}, ${data.address_b || null},
            ${data.delivery_time}, ${Number(data.delivery_fee)},
            ${data.description || null}, ${data.currency || 'BOB'},
            ${data.status || 'active'}, ${data.duration || null},
            ${data.reward_points}, ${data.city_id},
            ${JSON.stringify(data.address_metadata || {})}::jsonb,
            ${pricingSnapshot ? JSON.stringify(pricingSnapshot) : null}::jsonb,
            ST_SetSRID(ST_GeomFromText(${routeWKT}), 4326),
            NOW(), NOW()
          )
          RETURNING id
        `;

        const newId = inserted[0]?.id;
        order = await prisma.order.findUnique({
          where: { id: newId },
          include: {
            assignments: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        });
      } else {
        // Sin geometría de ruta: inserción normal con Prisma
        order = await prisma.order.create({
          data: {
            type: data.type,
            client_name: data.client_name,
            pickup: data.pickup,
            delivery: data.delivery,
            address_a: data.address_a || null,
            address_b: data.address_b || null,
            delivery_time: data.delivery_time,
            delivery_fee: data.delivery_fee,
            description: data.description || null,
            currency: data.currency || 'BOB',
            status: data.status || 'active',
            duration: data.duration || null,
            reward_points: data.reward_points,
            city_id: data.city_id,
            address_metadata: data.address_metadata || {},
            pricing_details: pricingSnapshot ?? undefined,
          },
          include: {
            assignments: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        });
      }

      if (io) io.emit('order_published', order);

      return res.status(201).json({
        message: '¡Reto logístico publicado!',
        order,
      });
    } catch (error: any) {
      console.error('[OrderController.store]', error);
      return res.status(500).json({ message: 'Error al crear pedido interno', error: error.message });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });
      if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
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
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });
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

  // ─── Helper: incluir assignments ──────────────────────────────────────────────
  static readonly withAssignments = {
    include: {
      assignments: {
        orderBy: { created_at: 'desc' } as any,
        take: 1,
      },
    },
  };

  // ─── Helper: normalizar metadata ──────────────────────────────────────────────
  static parseMetadata(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    if (typeof raw === 'object') return raw;
    return {};
  }

  // ─── GET /orders/available ────────────────────────────────────────────────────
  static async available(req: Request, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        where: { status: 'active' },
        orderBy: { created_at: 'desc' },
        ...OrderController.withAssignments,
      });
      return res.json({ orders });
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener pedidos disponibles' });
    }
  }

  // ─── PUT /orders/:id/pre-assign ───────────────────────────────────────────────
  // Reserva un pedido por 5 minutos para el driver (pre-assigned)
  static async preAssign(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { driver_id } = req.body;
    const io = (req as any).io;

    if (!driver_id) return res.status(400).json({ message: 'driver_id requerido' });

    try {
      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (!order || order.status !== 'active') {
          throw new Error('El pedido ya no está disponible');
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // +5 min

        return tx.order.update({
          where: { id },
          data: {
            status: 'pre-assigned',
            reserved_driver_id: parseInt(driver_id),
            reserved_at: now,
            reservation_expires_at: expiresAt,
          },
          ...OrderController.withAssignments,
        });
      });

      if (io) io.emit('order_pre_assigned', updatedOrder);
      return res.json(updatedOrder);
    } catch (error: any) {
      return res.status(409).json({ message: error.message || 'No se pudo reservar el pedido' });
    }
  }

  // ─── PUT /orders/:id/start ────────────────────────────────────────────────────
  // Driver confirma iniciar la carrera → assigned + OrderAssignment collected
  static async startDelivery(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { driver_id } = req.body;
    const io = (req as any).io;

    if (!driver_id) return res.status(400).json({ message: 'driver_id requerido' });

    try {
      await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (
          !order ||
          order.status !== 'pre-assigned' ||
          order.reserved_driver_id !== parseInt(driver_id)
        ) {
          throw new Error('No tienes permiso para iniciar este pedido');
        }

        await tx.order.update({
          where: { id },
          data: {
            status: 'assigned',
            reserved_driver_id: null,
            reserved_at: null,
            reservation_expires_at: null,
          },
        });

        await tx.orderAssignment.create({
          data: {
            order_id: id,
            user_id: parseInt(driver_id),
            status: 'collected',
            status_metadata: {
              collected_at: new Date().toISOString(),
              running_at: null,
              arrived_at: null,
              delivered_at: null,
              not_delivered_at: null,
            },
          },
        });
      });

      const finalOrder = await prisma.order.findUnique({
        where: { id },
        ...OrderController.withAssignments,
      });

      if (io) io.emit('order_assigned', finalOrder);
      return res.json(finalOrder);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al iniciar carrera' });
    }
  }

  // ─── PUT /orders/:id/abort-pre-assign ────────────────────────────────────────
  // Driver aborta la reserva → order vuelve a active, driver pierde 5 puntos
  static async abortPreAssign(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { driver_id } = req.body;
    const io = (req as any).io;

    if (!driver_id) return res.status(400).json({ message: 'driver_id requerido' });

    try {
      await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (
          !order ||
          order.status !== 'pre-assigned' ||
          order.reserved_driver_id !== parseInt(driver_id)
        ) {
          throw new Error('No tienes permiso para abortar este pedido');
        }

        // Liberar reserva
        await tx.order.update({
          where: { id },
          data: {
            status: 'active',
            reserved_driver_id: null,
            reserved_at: null,
            reservation_expires_at: null,
          },
        });

        // Penalizar al driver: -5 puntos (no bajar de 0)
        const driver = await tx.user.findUnique({ where: { id: parseInt(driver_id) } });
        if (driver) {
          await tx.user.update({
            where: { id: parseInt(driver_id) },
            data: { points: Math.max(0, driver.points - 5) },
          });
        }
      });

      const restoredOrder = await prisma.order.findUnique({
        where: { id },
        ...OrderController.withAssignments,
      });

      if (io) io.emit('order_activated', restoredOrder);
      return res.json({ message: 'Carrera abortada. Se descontaron 5 puntos.', order: restoredOrder });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al abortar carrera' });
    }
  }

  // ─── POST /orders/expire-reservations ────────────────────────────────────────
  // Expira reservas vencidas y devuelve los pedidos a 'active'
  static async expireReservations(req: Request, res: Response) {
    const io = (req as any).io;
    try {
      const expired = await prisma.order.findMany({
        where: {
          status: 'pre-assigned',
          reservation_expires_at: { lt: new Date() },
        },
      });

      for (const order of expired) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'active',
            reserved_driver_id: null,
            reserved_at: null,
            reservation_expires_at: null,
          },
        });
        if (io) io.emit('order_reservation_expired', { order_id: order.id });
        if (io) io.emit('order_activated', { ...order, status: 'active' });
      }

      return res.json({ expired: expired.length });
    } catch (error) {
      return res.status(500).json({ message: 'Error al expirar reservas' });
    }
  }

  // ─── PUT /orders/:id/accept (legacy — mantiene compatibilidad) ─────────────────
  static async accept(req: Request, res: Response) {
    return OrderController.preAssign(req, res);
  }

  // ─── PATCH /orders/:id/status ─────────────────────────────────────────────────
  static async updateStatus(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;
    const io = (req as any).io;

    const ORDER_STATUSES = ['pending', 'active', 'pre-assigned', 'assigned', 'canceled'];
    const ASSIGNMENT_STATUSES = ['collected', 'running', 'arrived', 'delivered', 'not-delivered'];

    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        ...OrderController.withAssignments,
      });

      if (!existingOrder) return res.status(404).json({ message: 'Pedido no encontrado' });

      let updatedOrder: any;

      if (existingOrder.status === 'assigned' && ASSIGNMENT_STATUSES.includes(status)) {
        // Actualizar estado de la asignación
        const latestAssignment = existingOrder.assignments[0];
        if (!latestAssignment) {
          return res.status(400).json({ message: 'No hay asignación activa' });
        }

        const meta = OrderController.parseMetadata(latestAssignment.status_metadata);
        const metaKey = status === 'not-delivered' ? 'not_delivered_at' : `${status}_at`;

        const newMetadata = {
          collected_at: meta.collected_at ?? null,
          running_at: meta.running_at ?? null,
          arrived_at: meta.arrived_at ?? null,
          delivered_at: meta.delivered_at ?? null,
          not_delivered_at: meta.not_delivered_at ?? null,
          [metaKey]: new Date().toISOString(),
        };

        await prisma.orderAssignment.update({
          where: { id: latestAssignment.id },
          data: { status, status_metadata: newMetadata },
        });

        const eventMap: Record<string, string> = {
          running: 'order_updated',
          arrived: 'order_arrived',
          delivered: 'order_delivered',
          'not-delivered': 'order_not_delivered',
        };
        updatedOrder = await prisma.order.findUnique({ where: { id }, ...OrderController.withAssignments });
        if (io) io.emit(eventMap[status] || 'order_updated', updatedOrder);

      } else if (ORDER_STATUSES.includes(status)) {
        // Actualizar estado del pedido directamente
        updatedOrder = await prisma.order.update({
          where: { id },
          data: { status },
          ...OrderController.withAssignments,
        });
        if (io) io.emit('order_updated', updatedOrder);

      } else {
        return res.status(400).json({ message: `Estado '${status}' no válido` });
      }

      return res.json(updatedOrder);
    } catch (error) {
      console.error('[OrderController.updateStatus]', error);
      return res.status(500).json({ message: 'Error al actualizar estado' });
    }
  }

  // ─── PATCH /orders/:id/complete ───────────────────────────────────────────────
  // Marca entrega como delivered + acredita recompensa en wallet dentro de transacción
  static async complete(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const io = (req as any).io;

    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        ...OrderController.withAssignments,
      });

      if (!existingOrder) return res.status(404).json({ message: 'Pedido no encontrado' });

      await prisma.$transaction(async (tx: any) => {
        const latestAssignment = existingOrder.assignments[0];
        if (latestAssignment) {
          const meta = OrderController.parseMetadata(latestAssignment.status_metadata);
          await tx.orderAssignment.update({
            where: { id: latestAssignment.id },
            data: {
              status: 'delivered',
              status_metadata: {
                ...meta,
                arrived_at: meta.arrived_at ?? null,
                delivered_at: new Date().toISOString(),
              },
            },
          });

          // ── Recompensas al driver ────────────────────────────────────────────
          const driverId = latestAssignment.user_id;

          // 1. Sumar reward_points al driver
          await tx.user.update({
            where: { id: driverId },
            data: { points: { increment: existingOrder.reward_points } },
          });

          // 2. Obtener o crear wallet
          let wallet = await tx.wallet.findUnique({ where: { user_id: driverId } });
          if (!wallet) {
            wallet = await tx.wallet.create({
              data: {
                user_id: driverId,
                balance: 0,
                currency: existingOrder.currency || 'BOB',
              },
            });
          }

          // 3. Crear transacción en wallet
          await tx.transaction.create({
            data: {
              wallet_id: wallet.id,
              type: 'delivery_reward',
              amount: existingOrder.delivery_fee,
              reference: `order_${id}`,
              metadata: {
                order_id: id,
                reward_points: existingOrder.reward_points,
                driver_id: driverId,
              },
            },
          });

          // 4. Actualizar balance
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: existingOrder.delivery_fee } },
          });
        }
      });

      const finalOrder = await prisma.order.findUnique({
        where: { id },
        ...OrderController.withAssignments,
      });

      if (io) io.emit('order_delivered', finalOrder);
      return res.json(finalOrder);
    } catch (error) {
      console.error('[OrderController.complete]', error);
      return res.status(500).json({ message: 'Error al finalizar pedido' });
    }
  }
}

