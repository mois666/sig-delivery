import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

const USER_INCLUDE = {
  wallet: true,
} as const;

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
}
