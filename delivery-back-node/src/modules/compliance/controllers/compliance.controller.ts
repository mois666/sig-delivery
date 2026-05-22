import { Request, Response } from 'express';
import { ComplianceService } from '../services/compliance.service';

const complianceService = new ComplianceService();

export class ComplianceController {
  static async recordConsent(req: Request, res: Response) {
    const { consentType, isGranted, policyVersion } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    
    // Asume que el usuario está autenticado y su id está en req.user.id
    // Si no, también permite obtenerlo desde req.body de manera opcional
    const userIdStr = (req as any).user?.id?.toString() || req.body.userId?.toString();

    if (!userIdStr) {
      return res.status(400).json({ message: 'Se requiere la identificación del usuario para registrar el consentimiento.' });
    }

    try {
      const consent = await complianceService.recordUserConsent(
        userIdStr,
        { consentType, isGranted, policyVersion },
        ip
      );

      return res.json({
        message: 'Consentimiento registrado correctamente de acuerdo a las directrices de privacidad.',
        consent,
      });
    } catch (error: any) {
      console.error('Error en ComplianceController.recordConsent:', error);
      return res.status(500).json({ message: 'Error al registrar el consentimiento', error: error.message });
    }
  }

  static async requestDeletion(req: Request, res: Response) {
    const { reason, customReason } = req.body;
    const userIdStr = (req as any).user?.id?.toString();

    if (!userIdStr) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    try {
      const deletionRequest = await complianceService.requestAccountDeletion(
        userIdStr,
        reason,
        customReason
      );

      // Limpia la cookie de refresh token si existe
      res.clearCookie('refresh_token');

      return res.json({
        message: 'Solicitud de eliminación de cuenta recibida. Tu cuenta ha sido desactivada temporalmente y se eliminará permanentemente en un período de 14 días.',
        deletionRequest,
      });
    } catch (error: any) {
      console.error('Error en ComplianceController.requestDeletion:', error);
      return res.status(500).json({ message: 'Error al solicitar la eliminación de cuenta', error: error.message });
    }
  }
}
