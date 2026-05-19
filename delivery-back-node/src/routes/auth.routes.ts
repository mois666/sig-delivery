import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { loginSchema } from '../schemas/auth.schema';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Rutas Públicas
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);

// Rutas Protegidas
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
