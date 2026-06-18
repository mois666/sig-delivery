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
        pickup:              { lat: pickupLat,   lng: pickupLng   },
        delivery:            { lat: deliveryLat, lng: deliveryLng },
        address_a:           data.address_a || '',
        address_b:           data.address_b || '',
        delivery_time:       formattedDeliveryTime,
        delivery_fee:        data.delivery_fee,
        // ── Datos de ruta (OSRM + PricingService) ───────────────────────────
        route_distance_km:   pricingDetails?.route_distance_km   ?? null,
        total_distance_km:   pricingDetails?.route_distance_km   ?? null,
        normal_distance_km:  pricingDetails?.normal_distance_km  ?? null,
        normal_cost:         pricingDetails?.normal_cost         ?? null,
        duration_seconds:    pricingDetails?.duration_seconds     ?? null,
        duration:            data.duration                        || null,
        base_fee:            pricingDetails?.base_fee             ?? null,
        zones:               pricingDetails?.zones                ?? [],
        total_delivery_fee:  pricingDetails?.total_delivery_fee   ?? data.delivery_fee,
        route_geometry:      pricingDetails?.route_geometry       ?? null,
      };

      // ── Persistir orden ─────────────────────────────────────────────────────
      // El campo route_geometry es un tipo PostGIS nativo (Unsupported en Prisma),
      // por lo que se guarda usando SQL raw para poder pasar el WKT correctamente.
      const routeWKT = pricingDetails?.route_geometry_wkt ?? null;

      const pricingSnapshot = pricingDetails
        ? {
            route_distance_km:  pricingDetails.route_distance_km,
            total_distance_km:  pricingDetails.route_distance_km,
            base_fee:           pricingDetails.base_fee,
            normal_distance_km: pricingDetails.normal_distance_km,
            normal_cost:        pricingDetails.normal_cost,
            zones:              pricingDetails.zones,
            total_delivery_fee: pricingDetails.total_delivery_fee,
            duration_seconds:   pricingDetails.duration_seconds,
            route_geometry:     pricingDetails.route_geometry,
          }
        : null;

      let order: any;

      if (routeWKT) {
        // Insertar con geometría de ruta vía SQL raw
        const inserted = await prisma.$queryRaw<Array<{ id: number }>>`
          INSERT INTO orders (
            type, client_name, pickup, delivery,
            address_a, address_b, delivery_time, delivery_fee,
            description, currency, status, duration, points,
            city_id, address_metadata, pricing_details,
            route_geometry, created_at, updated_at
          ) VALUES (
            ${data.type}, ${data.client_name}, ${data.pickup}, ${data.delivery},
            ${data.address_a || null}, ${data.address_b || null},
            ${data.delivery_time}, ${Number(data.delivery_fee)},
            ${data.description || null}, ${data.currency || 'BOB'},
            ${data.status || 'pending'}, ${data.duration || null},
            ${data.points || 0}, ${data.city_id},
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
            type:             data.type,
            client_name:      data.client_name,
            pickup:           data.pickup,
            delivery:         data.delivery,
            address_a:        data.address_a        || null,
            address_b:        data.address_b        || null,
            delivery_time:    data.delivery_time,
            delivery_fee:     data.delivery_fee,
            description:      data.description      || null,
            currency:         data.currency         || 'BOB',
            status:           data.status           || 'pending',
            duration:         data.duration         || null,
            points:           data.points           || 0,
            city_id:          data.city_id,
            address_metadata: data.address_metadata || {},
            pricing_details:  pricingSnapshot       ?? undefined,
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
      return res.status(500).json({ message: 'Error al crear pedido', error: error.message });
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
    const id   = parseInt(req.params.id as string);
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

  static async accept(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { driver_id } = req.body;
    const io = (req as any).io;
    try {
      const order = await prisma.$transaction(async (tx: any) => {
        const existingOrder = await tx.order.findUnique({ where: { id } });
        if (!existingOrder || !['pending', 'active', 'pre-assigned'].includes(existingOrder.status)) {
          throw new Error('El pedido ya no está disponible');
        }
        const updatedOrder = await tx.order.update({
          where: { id },
          data:  { status: 'assigned' },
        });
        await tx.orderAssignment.create({
          data: {
            order_id: id,
            user_id: parseInt(driver_id),
            status: 'collected',
            status_metadata: {
              collected_at: new Date(),
              running_at: null,
              arrived_at: null,
              delivered_at: null,
              'not-delivered_at': null
            }
          },
        });
        return updatedOrder;
      });

      const finalOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });

      if (io) io.emit('order_assigned', finalOrder);
      return res.json(finalOrder);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al aceptar pedido' });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;
    const io = (req as any).io;
    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });

      if (!existingOrder) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }

      let updatedOrder: any;

      if (existingOrder.status === 'assigned') {
        const latestAssignment = existingOrder.assignments[0];
        if (!latestAssignment) {
          return res.status(400).json({ message: 'No se encontró una asignación activa para este pedido' });
        }

        const assignmentStatuses = ['collected', 'running', 'arrived', 'delivered', 'not-delivered'];
        if (!assignmentStatuses.includes(status)) {
          if (status === 'canceled') {
            updatedOrder = await prisma.order.update({
              where: { id },
              data: { status: 'canceled' },
              include: {
                assignments: {
                  orderBy: { created_at: 'desc' },
                  take: 1
                }
              }
            });
            if (io) io.emit('order_updated', updatedOrder);
            return res.json(updatedOrder);
          }
          return res.status(400).json({ message: 'Estado de asignación no válido' });
        }

        let currentMetadata: any = latestAssignment.status_metadata;
        if (typeof currentMetadata === 'string') {
          try {
            currentMetadata = JSON.parse(currentMetadata);
          } catch {
            currentMetadata = {};
          }
        } else if (!currentMetadata || typeof currentMetadata !== 'object') {
          currentMetadata = {};
        }

        const newMetadata = {
          collected_at: currentMetadata.collected_at || null,
          running_at: currentMetadata.running_at || null,
          arrived_at: currentMetadata.arrived_at || null,
          delivered_at: currentMetadata.delivered_at || null,
          'not-delivered_at': currentMetadata['not-delivered_at'] || null,
          [`${status}_at`]: new Date()
        };

        await prisma.orderAssignment.update({
          where: { id: latestAssignment.id },
          data: {
            status,
            status_metadata: newMetadata
          }
        });

        updatedOrder = await prisma.order.findUnique({
          where: { id },
          include: {
            assignments: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          }
        });
      } else {
        const orderStatuses = ['pending', 'active', 'pre-assigned', 'assigned', 'canceled'];
        if (!orderStatuses.includes(status)) {
          return res.status(400).json({ message: 'Estado de pedido no válido' });
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: { status },
          include: {
            assignments: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          }
        });
      }

      if (io) io.emit('order_updated', updatedOrder);
      return res.json(updatedOrder);
    } catch (error) {
      console.error('[OrderController.updateStatus] error:', error);
      return res.status(500).json({ message: 'Error al actualizar estado del pedido' });
    }
  }

  static async complete(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const io = (req as any).io;
    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });

      if (!existingOrder) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }

      let updatedOrder: any;

      if (existingOrder.status === 'assigned') {
        const latestAssignment = existingOrder.assignments[0];
        if (latestAssignment) {
          let currentMetadata: any = latestAssignment.status_metadata;
          if (typeof currentMetadata === 'string') {
            try {
              currentMetadata = JSON.parse(currentMetadata);
            } catch {
              currentMetadata = {};
            }
          } else if (!currentMetadata || typeof currentMetadata !== 'object') {
            currentMetadata = {};
          }

          const newMetadata = {
            collected_at: currentMetadata.collected_at || null,
            running_at: currentMetadata.running_at || null,
            arrived_at: currentMetadata.arrived_at || null,
            delivered_at: new Date(),
            'not-delivered_at': currentMetadata['not-delivered_at'] || null
          };

          await prisma.orderAssignment.update({
            where: { id: latestAssignment.id },
            data: {
              status: 'delivered',
              status_metadata: newMetadata
            }
          });
        }

        updatedOrder = await prisma.order.findUnique({
          where: { id },
          include: {
            assignments: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          }
        });
      } else {
        updatedOrder = await prisma.order.update({
          where: { id },
          data: { status: 'assigned' },
          include: {
            assignments: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          }
        });
      }

      if (io) io.emit('order_completed', updatedOrder);
      return res.json(updatedOrder);
    } catch (error) {
      console.error('[OrderController.complete] error:', error);
      return res.status(500).json({ message: 'Error al finalizar pedido' });
    }
  }
}
