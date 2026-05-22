import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123_change_this_later';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { phone, pin } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { phone },
        include: {
          city: { select: { id: true, name: true, country: true, currency: true } },
        },
      });

      if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const isPinMatch = user.pin.startsWith('$2')
        ? await bcrypt.compare(pin, user.pin)
        : user.pin === pin;

      if (!isPinMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const accessToken = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role, city_id: user.city_id },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ user, accessToken });
    } catch (error) {
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  }

  static async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No autorizado / Sesión expirada' });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { city: { select: { id: true, name: true, country: true, currency: true } } },
      });

      if (!user) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      const newAccessToken = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role, city_id: user.city_id },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      return res.json({ user, accessToken: newAccessToken });
    } catch (error) {
      return res.status(401).json({ message: 'Token de refresco inválido' });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('refresh_token');
    return res.json({ message: 'Sesión cerrada correctamente' });
  }
}
