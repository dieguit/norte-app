import { z } from 'zod';

declare const PlaceholderStatusSchema: z.ZodEnum<{
    todo: "todo";
    "in-progress": "in-progress";
    done: "done";
}>;
type PlaceholderStatus = z.infer<typeof PlaceholderStatusSchema>;
declare const PlaceholderItemSchema: z.ZodObject<{
    id: z.ZodUUID;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        todo: "todo";
        "in-progress": "in-progress";
        done: "done";
    }>;
    createdAt: z.ZodISODateTime;
    updatedAt: z.ZodISODateTime;
}, z.core.$strip>;
type PlaceholderItem = z.infer<typeof PlaceholderItemSchema>;
declare const PlaceholderItemListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodUUID;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        todo: "todo";
        "in-progress": "in-progress";
        done: "done";
    }>;
    createdAt: z.ZodISODateTime;
    updatedAt: z.ZodISODateTime;
}, z.core.$strip>>;
type PlaceholderItemList = z.infer<typeof PlaceholderItemListSchema>;
declare const CreatePlaceholderItemSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
type CreatePlaceholderItem = z.infer<typeof CreatePlaceholderItemSchema>;
declare const UpdatePlaceholderItemSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        todo: "todo";
        "in-progress": "in-progress";
        done: "done";
    }>>;
}, z.core.$strip>;
type UpdatePlaceholderItem = z.infer<typeof UpdatePlaceholderItemSchema>;
declare const DeletePlaceholderItemResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
type DeletePlaceholderItemResponse = z.infer<typeof DeletePlaceholderItemResponseSchema>;

export { type CreatePlaceholderItem, CreatePlaceholderItemSchema, type DeletePlaceholderItemResponse, DeletePlaceholderItemResponseSchema, type PlaceholderItem, type PlaceholderItemList, PlaceholderItemListSchema, PlaceholderItemSchema, type PlaceholderStatus, PlaceholderStatusSchema, type UpdatePlaceholderItem, UpdatePlaceholderItemSchema };
