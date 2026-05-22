import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';

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
      const order = await prisma.order.create({
        data,
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
