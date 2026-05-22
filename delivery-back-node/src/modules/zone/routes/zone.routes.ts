import { Router } from 'express';
import { ZoneController } from '../controllers/zone.controller';
import { authMiddleware } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { zoneSchema, checkRateSchema } from '../validations/zone.validation';

const router = Router();

router.use(authMiddleware);

router.get('/', ZoneController.index);
router.post('/', validate(zoneSchema), ZoneController.store);
router.get('/check-rate', validate(checkRateSchema), ZoneController.checkRate);
router.get('/active-zones', ZoneController.activeZones);
router.post('/maps/expand-url', ZoneController.expandUrl);
router.get('/:id', ZoneController.show);
router.put('/:id', validate(zoneSchema), ZoneController.update);
router.delete('/:id', ZoneController.destroy);

export default router;
