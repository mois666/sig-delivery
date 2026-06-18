import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { orderStoreSchema, orderUpdateSchema } from '../validations/order.validation';

const router = Router();

// Rutas públicas
router.post('/calculate-fee', OrderController.calculateFee);
router.post('/', validate(orderStoreSchema), OrderController.store);


// Rutas protegidas
router.use(authMiddleware);

router.get('/', OrderController.index);
router.get('/available', OrderController.available);          // solo status=active
router.get('/:id', OrderController.show);
router.put('/:id', validate(orderUpdateSchema), OrderController.update);
router.put('/:id/pre-assign', OrderController.preAssign);     // reserva 5 min
router.put('/:id/start', OrderController.startDelivery);      // inicia carrera
router.put('/:id/abort-pre-assign', OrderController.abortPreAssign); // aborta reserva
router.put('/:id/accept', OrderController.accept);            // legacy alias → preAssign
router.patch('/:id/status', OrderController.updateStatus);
router.patch('/:id/complete', OrderController.complete);
router.post('/expire-reservations', OrderController.expireReservations);
router.delete('/:id', OrderController.destroy);

export default router;
