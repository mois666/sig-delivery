import { Router } from 'express';
import { CityController } from '../controllers/city.controller';
import { authMiddleware, authorizeRoles } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { cityStoreSchema, cityUpdateSchema } from '../validations/city.validation';

const router = Router();

// GET /cities — público (sin auth), necesario para el formulario de login
router.get('/', CityController.index);
router.get('/:id', CityController.show);

// CRUD protegido — solo admins
router.use(authMiddleware);
router.post('/',    authorizeRoles('admin', 'super_admin'), validate(cityStoreSchema),  CityController.store);
router.put('/:id',  authorizeRoles('admin', 'super_admin'), validate(cityUpdateSchema), CityController.update);
router.delete('/:id', authorizeRoles('admin', 'super_admin'), CityController.destroy);

export default router;
