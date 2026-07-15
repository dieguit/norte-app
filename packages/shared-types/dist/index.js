// src/placeholder.schema.ts
import { z } from "zod";
var PlaceholderStatusSchema = z.enum(["todo", "in-progress", "done"]);
var PlaceholderItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  status: PlaceholderStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});
var PlaceholderItemListSchema = z.array(PlaceholderItemSchema);
var CreatePlaceholderItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().default("")
});
var UpdatePlaceholderItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  description: z.string().optional(),
  status: PlaceholderStatusSchema.optional()
});
var DeletePlaceholderItemResponseSchema = z.object({
  success: z.boolean()
});
export {
  CreatePlaceholderItemSchema,
  DeletePlaceholderItemResponseSchema,
  PlaceholderItemListSchema,
  PlaceholderItemSchema,
  PlaceholderStatusSchema,
  UpdatePlaceholderItemSchema
};
