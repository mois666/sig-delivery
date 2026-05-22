import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';

export class UserController {
  static async index(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany();
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener usuarios' });
    }
  }

  static async store(req: Request, res: Response) {
    const { name, phone, pin, email, city, role, status } = req.body;

    try {
      const user = await prisma.user.create({
        data: {
          name,
          phone,
          pin,
          email,
          city,
          role,
          status,
        },
      });

      // Create Wallet
      await prisma.wallet.create({
        data: {
          user_id: user.id,
          balance: 0,
        },
      });

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        user,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al crear usuario' });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { wallet: true },
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      return res.json({
        user,
        wallet: user.wallet,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener usuario' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const data = req.body;

    // Si el pin está vacío o no se proporciona, no lo actualizamos
    if (!data.pin) {
      delete data.pin;
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data,
      });

      return res.json({
        message: 'Usuario actualizado con éxito',
        user,
      });
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
        where: {
          role: 'driver',
          status: 'active',
        },
      });
      return res.json(activeDrivers);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener repartidores activos' });
    }
  }
}
