import { Router } from 'express';
import { CityController } from '../controllers/city.controller';
import { ZoneController } from '../../zone/controllers/zone.controller';
import { authMiddleware, authorizeRoles } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { cityStoreSchema, cityUpdateSchema } from '../validations/city.validation';
import { zoneSchema } from '../../zone/validations/zone.validation';

const router = Router();

// GET /cities — público (sin auth), necesario para el formulario de login
router.get('/', CityController.index);
router.get('/:id', CityController.show);

// CRUD protegido — solo admins
router.use(authMiddleware);
router.post('/',    authorizeRoles('admin', 'super_admin'), validate(cityStoreSchema),  CityController.store);
router.put('/:id',  authorizeRoles('admin', 'super_admin'), validate(cityUpdateSchema), CityController.update);
router.delete('/:id', authorizeRoles('admin', 'super_admin'), CityController.destroy);

// Zonas anidadas bajo /cities/:cityId/zones
router.get('/:cityId/zones',      ZoneController.byCity);
router.post('/:cityId/zones',     authorizeRoles('admin', 'super_admin'), validate(zoneSchema), ZoneController.store);
router.put('/:cityId/zones/:id',  authorizeRoles('admin', 'super_admin'), validate(zoneSchema), ZoneController.update);
router.delete('/:cityId/zones/:id', authorizeRoles('admin', 'super_admin'), ZoneController.destroy);

export default router;
