import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { orderStoreSchema, orderUpdateSchema } from '../validations/order.validation';

const router = Router();

// Rutas públicas
router.post('/', validate(orderStoreSchema), OrderController.store);

// Rutas protegidas
router.use(authMiddleware);

router.get('/', OrderController.index);
router.get('/:id', OrderController.show);
router.put('/:id', validate(orderUpdateSchema), OrderController.update);
router.put('/:id/accept', OrderController.accept);
router.patch('/:id/status', OrderController.updateStatus);
router.patch('/:id/complete', OrderController.complete);
router.delete('/:id', OrderController.destroy);

export default router;
