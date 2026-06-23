import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

/** Rango de fechas para filtro de ranking */
const getPeriodRange = (period: string): { gte: Date; lte: Date } => {
  const now = new Date();
  const gte = new Date();
  gte.setHours(0, 0, 0, 0);

  if (period === 'week') {
    gte.setDate(now.getDate() - 6);
  } else if (period === 'month') {
    gte.setDate(now.getDate() - 29);
  }
  return { gte, lte: now };
};

export class UserController {
  static async index(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { created_at: 'desc' },
      });

      const userIds = users.map((u) => u.id);
      const wallets = await prisma.wallet.findMany({
        where: { user_id: { in: userIds } },
      });

      const usersWithWallet = users.map((u) => {
        const wallet = wallets.find((w) => w.user_id === u.id);
        return {
          ...u,
          wallet: wallet || null,
        };
      });

      return res.json(usersWithWallet);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener usuarios' });
    }
  }

  static async store(req: Request, res: Response) {
    const { name, phone, pin, email, transport_type, role, status } = req.body;

    try {
      const hashedPin = await bcrypt.hash(pin, 10);
      const user = await prisma.user.create({
        data: {
          name,
          phone,
          pin: hashedPin,
          email,
          transport_type: transport_type || 'motorcycle',
          role,
          status,
        },
      });

      const wallet = await prisma.wallet.create({ data: { user_id: user.id, balance: 0 } });

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        user: { ...user, wallet },
      });
    } catch (error: any) {
      console.error('UserController.store:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'El teléfono o email ya están registrados' });
      }
      return res.status(500).json({ message: 'Error al crear usuario' });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const currentUser = (req as any).user;
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.id !== id) {
      return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

      const wallet = await prisma.wallet.findUnique({ where: { user_id: id } });

      return res.json({ user, wallet });
    } catch (error) {
      console.error('UserController.show error:', error);
      return res.status(500).json({ message: 'Error al obtener usuario' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const data = { ...req.body };

    // Eliminar city_id si viene por error en el body
    delete data.city_id;

    // Hashear PIN si se proporciona
    if (!data.pin) {
      delete data.pin;
    } else {
      data.pin = await bcrypt.hash(data.pin, 10);
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data,
      });

      const wallet = await prisma.wallet.findUnique({ where: { user_id: id } });

      return res.json({
        message: 'Usuario actualizado con éxito',
        user: { ...user, wallet },
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar usuario' });
    }
  }

  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
      // Eliminar manualmente la billetera del usuario por falta de cascada física en BD
      await prisma.wallet.deleteMany({ where: { user_id: id } });

      await prisma.user.delete({ where: { id } });
      return res.json({ message: 'Usuario eliminado' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar usuario' });
    }
  }

  static async getDriversActive(req: Request, res: Response) {
    try {
      const activeDrivers = await prisma.user.count({
        where: { role: 'driver', status: 'active' },
      });
      return res.json(activeDrivers);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener repartidores activos' });
    }
  }

  /** Top 10 repartidores por puntos, filtrado por período */
  static async getDriversRanking(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || 'today';
      const range = getPeriodRange(period);

      // Obtener los drivers con mayor cantidad de puntos en el período
      const drivers = await prisma.user.findMany({
        where: { role: 'driver' },
        orderBy: { points: 'desc' },
        take: 10,
      });

      const driverIds = drivers.map((d) => d.id);

      // Consultar billeteras de forma independiente
      const wallets = await prisma.wallet.findMany({
        where: { user_id: { in: driverIds } },
      });

      // Consultar entregas realizadas en el rango
      const assignments = await prisma.orderAssignment.findMany({
        where: {
          user_id: { in: driverIds },
          status: 'delivered',
          created_at: range,
        },
      });

      const ranking = drivers.map((d, index) => {
        const wallet = wallets.find((w) => w.user_id === d.id);
        const driverAssignments = assignments.filter((a) => a.user_id === d.id);
        return {
          id: String(d.id),
          name: d.name,
          points: d.points,
          deliveries: driverAssignments.length,
          level: 1,
          rank: index + 1,
          balance: wallet ? Number(wallet.balance) : 0,
          trend: 'same' as const,
        };
      });

      return res.json(ranking);
    } catch (error) {
      console.error('getDriversRanking:', error);
      return res.status(500).json({ message: 'Error al obtener ranking' });
    }
  }

  /** Lista todos los conductores con su wallet y puntos */
  static async getDriverWallets(req: Request, res: Response) {
    try {
      const drivers = await prisma.user.findMany({
        where: { role: 'driver' },
        orderBy: { points: 'desc' },
      });

      const driverIds = drivers.map((d) => d.id);

      // Consultar billeteras de forma independiente
      const wallets = await prisma.wallet.findMany({
        where: { user_id: { in: driverIds } },
      });

      const result = drivers.map((d) => {
        const wallet = wallets.find((w) => w.user_id === d.id);
        return {
          id: d.id,
          name: d.name,
          phone: d.phone,
          points: d.points,
          level: 1,
          status: d.status,
          balance: wallet ? Number(wallet.balance) : 0,
          wallet_id: wallet ? wallet.id : null,
        };
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener billeteras' });
    }
  }

  /** Historial de transacciones de un conductor */
  static async getDriverTransactions(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const currentUser = (req as any).user;
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.id !== id) {
      return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
    }

    try {
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: id },
        include: {
          transactions: {
            orderBy: { created_at: 'desc' },
            take: 50,
          },
        },
      });

      if (!wallet) return res.status(404).json({ message: 'Billetera no encontrada' });
      return res.json({ wallet_id: wallet.id, balance: wallet.balance, transactions: wallet.transactions });
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener transacciones' });
    }
  }

  static async getDriverDeliveries(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const currentUser = (req as any).user;
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.id !== id) {
      return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
    }

    try {
      const deliveries = await prisma.orderAssignment.findMany({
        where: {
          user_id: id,
          status: 'delivered',
        },
        include: {
          order: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return res.json({ deliveries });
    } catch (error) {
      console.error('getDriverDeliveries:', error);
      return res.status(500).json({ message: 'Error al obtener historial de entregas' });
    }
  }
}
