import { z } from 'zod';
import { DeletionReason } from '@prisma/client';

export const CreateDeletionRequestSchema = z.object({
    body: z.object({
        reason: z.nativeEnum(DeletionReason, {
            message: "Razón de eliminación inválida según las políticas de la app."
        }),
        customReason: z.string().max(500).optional()
    })
});

export const GiveConsentSchema = z.object({
    body: z.object({
        consentType: z.string().min(3),
        isGranted: z.boolean(),
        policyVersion: z.string()
    })
});