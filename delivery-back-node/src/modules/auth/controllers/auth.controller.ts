import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123_change_this_later';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { phone, pin, city_id } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { phone },
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

      const resolvedCityId = city_id ? Number(city_id) : 1;
      const city = await prisma.city.findUnique({
        where: { id: resolvedCityId },
        select: { id: true, name: true, country: true, currency: true, base_delivery_fee: true, center_lat_lng: true, is_active: true },
      });

      const accessToken = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role, city_id: resolvedCityId },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const refreshToken = jwt.sign(
        { id: user.id, city_id: resolvedCityId },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const userWithCity = { ...user, city };

      return res.json({ user: userWithCity, accessToken });
    } catch (error) {
      console.error('Login error:', error);
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
      });

      if (!user) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      const resolvedCityId = decoded.city_id ? Number(decoded.city_id) : 1;
      const city = await prisma.city.findUnique({
        where: { id: resolvedCityId },
        select: { id: true, name: true, country: true, currency: true, base_delivery_fee: true, center_lat_lng: true, is_active: true },
      });

      const newAccessToken = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role, city_id: resolvedCityId },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const userWithCity = { ...user, city };

      return res.json({ user: userWithCity, accessToken: newAccessToken });
    } catch (error) {
      return res.status(401).json({ message: 'Token de refresco inválido' });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('refresh_token');
    return res.json({ message: 'Sesión cerrada correctamente' });
  }
}
