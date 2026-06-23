import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, authorizeRoles } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { userStoreSchema, userUpdateSchema } from '../validations/user.validation';

const router = Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('admin', 'super_admin'), UserController.index);
router.post('/', authorizeRoles('admin', 'super_admin'), validate(userStoreSchema), UserController.store);
router.get('/drivers-active', UserController.getDriversActive);
router.get('/ranking', authorizeRoles('admin', 'super_admin', 'driver'), UserController.getDriversRanking);
router.get('/wallets', authorizeRoles('admin', 'super_admin'), UserController.getDriverWallets);
router.get('/:id', authorizeRoles('admin', 'super_admin', 'driver', 'client'), UserController.show);
router.put('/:id', authorizeRoles('admin', 'super_admin'), validate(userUpdateSchema), UserController.update);
router.delete('/:id', authorizeRoles('admin', 'super_admin'), UserController.destroy);
router.get('/:id/transactions', authorizeRoles('admin', 'super_admin', 'driver'), UserController.getDriverTransactions);
router.get('/:id/deliveries', authorizeRoles('admin', 'super_admin', 'driver'), UserController.getDriverDeliveries);

export default router;
