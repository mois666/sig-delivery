import { Router } from 'express';
import { authRoutes } from '../modules/auth';
import { userRoutes, UserController } from '../modules/user';
import { zoneRoutes } from '../modules/zone';
import { orderRoutes } from '../modules/order';
import { complianceRoutes } from '../modules/compliance';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/zones', zoneRoutes);
router.use('/orders', orderRoutes);
router.use('/compliance', complianceRoutes);
router.get('/drivers-active', UserController.getDriversActive);

export default router;
