import { Router } from 'express';
import { ComplianceController } from '../controllers/compliance.controller';
import { authMiddleware } from '../../../middlewares/auth';
import { validate } from '../../../middlewares/validate';
import { GiveConsentSchema, CreateDeletionRequestSchema } from '../validations/compliance.validation';

const router = Router();

// Registrar consentimiento (puede ser llamado desde pantallas pre-login o post-login)
router.post('/consent', validate(GiveConsentSchema), ComplianceController.recordConsent);

// Solicitar borrado de cuenta (requiere estar autenticado)
router.post('/delete-account', authMiddleware, validate(CreateDeletionRequestSchema), ComplianceController.requestDeletion);

export default router;
