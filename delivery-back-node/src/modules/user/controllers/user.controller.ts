import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

const USER_INCLUDE = {
  wallet: true,
} as const;

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
        include: { wallet: true },
        orderBy: { created_at: 'desc' },
      });
      return res.json(users);
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
        include: USER_INCLUDE,
      });

      await prisma.wallet.create({ data: { user_id: user.id, balance: 0 } });

      return res.status(201).json({ message: 'Usuario creado correctamente', user });
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
    try {
      const user = await prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
      return res.json({ user, wallet: user.wallet });
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener usuario' });
    }
  }

  static async update(req: Request, res: Response) {
    const id   = parseInt(req.params.id as string);
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
        include: USER_INCLUDE,
      });
      return res.json({ message: 'Usuario actualizado con éxito', user });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar usuario' });
    }
  }

  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
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
        include: {
          wallet: true,
          assignments: {
            where: {
              status: 'delivered',
              created_at: range,
            },
          },
        },
        orderBy: { points: 'desc' },
        take: 10,
      });

      const ranking = drivers.map((d, index) => ({
        id: String(d.id),
        name: d.name,
        points: d.points,
        deliveries: d.assignments.length,
        level: 1,
        rank: index + 1,
        balance: d.wallet?.balance ?? 0,
        trend: 'same' as const,
      }));

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
        include: { wallet: true },
        orderBy: { points: 'desc' },
      });

      const result = drivers.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        points: d.points,
        level: 1,
        status: d.status,
        balance: d.wallet?.balance ?? 0,
        wallet_id: d.wallet?.id ?? null,
      }));

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener billeteras' });
    }
  }

  /** Historial de transacciones de un conductor */
  static async getDriverTransactions(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
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
}
