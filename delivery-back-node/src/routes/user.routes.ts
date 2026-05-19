import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { userStoreSchema, userUpdateSchema } from '../schemas/user.schema';

const router = Router();

router.use(authMiddleware);

router.get('/', UserController.index);
router.post('/', validate(userStoreSchema), UserController.store);
router.get('/drivers-active', UserController.getDriversActive);
router.get('/:id', UserController.show);
router.put('/:id', validate(userUpdateSchema), UserController.update);
router.delete('/:id', UserController.destroy);

export default router;
