import { z } from 'zod';

const SavingsPlaceNameSchema = z.string().trim().min(1).max(120);
export const CreateSavingsPlaceSchema = z.object({ name: SavingsPlaceNameSchema });
export const RenameSavingsPlaceSchema = z.object({ name: SavingsPlaceNameSchema });
export const SavingsPlaceIdParamsSchema = z.object({ id: z.string().uuid() });
export const SavingsTransferSchema = z.object({
  fromPlaceId: z.string().uuid(), toPlaceId: z.string().uuid(),
  currency: z.enum(['ARS', 'USD']), amount: z.string().min(1),
}).refine((value) => value.fromPlaceId !== value.toPlaceId, { message: 'El origen y el destino deben ser distintos.' });
export const SavingsPlaceMutationResponseSchema = z.object({ placeId: z.string().uuid() });
export const SavingsTransferResponseSchema = z.object({ transferId: z.string().uuid() });
