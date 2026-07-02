import { z } from 'zod';

export const PlaceholderStatusSchema = z.enum(['todo', 'in-progress', 'done']);
export type PlaceholderStatus = z.infer<typeof PlaceholderStatusSchema>;

export const PlaceholderItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  status: PlaceholderStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PlaceholderItem = z.infer<typeof PlaceholderItemSchema>;

export const PlaceholderItemListSchema = z.array(PlaceholderItemSchema);
export type PlaceholderItemList = z.infer<typeof PlaceholderItemListSchema>;

export const CreatePlaceholderItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().default(''),
});
export type CreatePlaceholderItem = z.infer<typeof CreatePlaceholderItemSchema>;

export const UpdatePlaceholderItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().optional(),
  status: PlaceholderStatusSchema.optional(),
});
export type UpdatePlaceholderItem = z.infer<typeof UpdatePlaceholderItemSchema>;

export const DeletePlaceholderItemResponseSchema = z.object({
  success: z.boolean(),
});
export type DeletePlaceholderItemResponse = z.infer<
  typeof DeletePlaceholderItemResponseSchema
>;
