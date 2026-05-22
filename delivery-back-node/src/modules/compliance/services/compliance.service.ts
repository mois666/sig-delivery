import prisma from '../../../lib/prisma';
import crypto from 'crypto';

export class ComplianceService {

    // Registrar consentimiento auditable (Requisito estricto de Google para Background Location)
    async recordUserConsent(userId: string, data: { consentType: string; isGranted: boolean; policyVersion: string }, ip: string) {
        const userIdNum = parseInt(userId, 10);
        return await prisma.userConsent.upsert({
            where: {
                userId_consentType_policyVersion: {
                    userId: userIdNum,
                    consentType: data.consentType,
                    policyVersion: data.policyVersion
                }
            },
            update: {
                isGranted: data.isGranted,
                ipAddress: ip,
                revokedAt: data.isGranted ? null : new Date()
            },
            create: {
                userId: userIdNum,
                consentType: data.consentType,
                isGranted: data.isGranted,
                policyVersion: data.policyVersion,
                ipAddress: ip
            }
        });
    }

    // Crear solicitud inmediata de deshabilitación y agendamiento de borrado permanente
    async requestAccountDeletion(userId: string, reason: any, customReason?: string) {
        const GRACE_PERIOD_DAYS = 14; // Periodo de gracia reglamentario
        const scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + GRACE_PERIOD_DAYS);
        const userIdNum = parseInt(userId, 10);

        return await prisma.$transaction(async (tx: any) => {
            // 1. Cambiar estado del usuario inmediatamente para bloquear accesos JWT
            await tx.user.update({
                where: { id: userIdNum },
                data: { isActive: false, deletedAt: new Date() }
            });

            // 2. Desactivar todos sus tokens de Firebase asignados
            await tx.deviceToken.updateMany({
                where: { userId: userIdNum },
                data: { isActive: false }
            });

            // 3. Registrar la solicitud auditable para la Play Store
            return await tx.accountDeletionRequest.create({
                data: {
                    userId: userIdNum,
                    reason,
                    customReason,
                    status: 'PENDING',
                    scheduledFor
                }
            });
        });
    }

    // CRON JOB RECOMENDADO: Ejecutar diariamente para anonimizar usuarios (Hard/Soft Purge)
    async purgeScheduledAccounts() {
        const now = new Date();
        const pendingDeletions = await prisma.accountDeletionRequest.findMany({
            where: { status: 'PENDING', scheduledFor: { lte: now } }
        });

        for (const request of pendingDeletions) {
            await prisma.$transaction(async (tx: any) => {
                const hashedEmail = crypto.createHash('sha256').update(`deleted-${request.userId}@app.com`).digest('hex').substring(0, 30);

                // Anonimizar la tabla User (Cumple con Google conservando PKs para integridad de las órdenes)
                await tx.user.update({
                    where: { id: request.userId },
                    data: {
                        name: "Usuario Eliminado",
                        email: `${hashedEmail}@deleted.internal`,
                        password: "NOT_ACCESSIBLE_REDACTED",
                        isActive: false
                    }
                });

                // Actualizar estado de la solicitud
                await tx.accountDeletionRequest.update({
                    where: { id: request.id },
                    data: { status: 'PROCESSED', processedAt: new Date() }
                });
            });
        }
    }
}