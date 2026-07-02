import { z } from 'zod';
export const PlaceholderStatusSchema = z.enum(['todo', 'in-progress', 'done']);
export const PlaceholderItemSchema = z.object({
    id: z.uuid(),
    title: z.string().min(1, 'Title is required'),
    description: z.string(),
    status: PlaceholderStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});
export const PlaceholderItemListSchema = z.array(PlaceholderItemSchema);
export const CreatePlaceholderItemSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional().default(''),
});
export const UpdatePlaceholderItemSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200).optional(),
    description: z.string().optional(),
    status: PlaceholderStatusSchema.optional(),
});
export const DeletePlaceholderItemResponseSchema = z.object({
    success: z.boolean(),
});
