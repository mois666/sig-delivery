import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import zoneRoutes from './zone.routes';
import orderRoutes from './order.routes';
import { UserController } from '../controllers/user.controller';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/zones', zoneRoutes);
router.use('/orders', orderRoutes);
router.get('/drivers-active', UserController.getDriversActive);

export default router;
