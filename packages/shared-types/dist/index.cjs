"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CreatePlaceholderItemSchema: () => CreatePlaceholderItemSchema,
  DeletePlaceholderItemResponseSchema: () => DeletePlaceholderItemResponseSchema,
  PlaceholderItemListSchema: () => PlaceholderItemListSchema,
  PlaceholderItemSchema: () => PlaceholderItemSchema,
  PlaceholderStatusSchema: () => PlaceholderStatusSchema,
  UpdatePlaceholderItemSchema: () => UpdatePlaceholderItemSchema
});
module.exports = __toCommonJS(index_exports);

// src/placeholder.schema.ts
var import_zod = require("zod");
var PlaceholderStatusSchema = import_zod.z.enum(["todo", "in-progress", "done"]);
var PlaceholderItemSchema = import_zod.z.object({
  id: import_zod.z.uuid(),
  title: import_zod.z.string().min(1, "Title is required"),
  description: import_zod.z.string(),
  status: PlaceholderStatusSchema,
  createdAt: import_zod.z.iso.datetime(),
  updatedAt: import_zod.z.iso.datetime()
});
var PlaceholderItemListSchema = import_zod.z.array(PlaceholderItemSchema);
var CreatePlaceholderItemSchema = import_zod.z.object({
  title: import_zod.z.string().min(1, "Title is required").max(200),
  description: import_zod.z.string().optional().default("")
});
var UpdatePlaceholderItemSchema = import_zod.z.object({
  title: import_zod.z.string().min(1, "Title is required").max(200).optional(),
  description: import_zod.z.string().optional(),
  status: PlaceholderStatusSchema.optional()
});
var DeletePlaceholderItemResponseSchema = import_zod.z.object({
  success: import_zod.z.boolean()
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CreatePlaceholderItemSchema,
  DeletePlaceholderItemResponseSchema,
  PlaceholderItemListSchema,
  PlaceholderItemSchema,
  PlaceholderStatusSchema,
  UpdatePlaceholderItemSchema
});
