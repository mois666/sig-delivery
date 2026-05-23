import { Router } from 'express';
import { authRoutes } from '../modules/auth';
import { userRoutes, UserController } from '../modules/user';
import { zoneRoutes } from '../modules/zone';
import { orderRoutes } from '../modules/order';
import { complianceRoutes } from '../modules/compliance';
import { cityRoutes } from '../modules/city';
import { ZoneController } from '../modules/zone/controllers/zone.controller';

const router = Router();

router.use('/auth',       authRoutes);
router.use('/users',      userRoutes);
router.use('/zones',      zoneRoutes);
router.use('/orders',     orderRoutes);
router.use('/compliance', complianceRoutes);
router.use('/cities',     cityRoutes);
router.get('/drivers-active', UserController.getDriversActive);
router.post('/maps/expand-url', ZoneController.expandUrl);

export default router;
