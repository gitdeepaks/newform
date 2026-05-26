import { z } from "zod";

export const formStatusSchema = z.enum(["draft", "published", "archived"]);
export const formVisibilitySchema = z.enum(["public", "unlisted"]);
export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens");

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(55).describe("The title of the form"),
  description: z.string().max(300).optional().describe("The description of the form"),
  createdBy: z.string().describe("The id of the user creating the form"),
});

export const listFromByUserIdInputSchema = z.object({
  userId: z.string().describe("The id of the user who created the forms"),
});

export const getFormByIdInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
});

export const getFormByOwnerInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
  userId: z.string().describe("The id of the form owner"),
});

export const updateFormInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
  userId: z.string().describe("The id of the form owner"),
  title: z.string().min(1).max(55).optional(),
  description: z.string().max(300).nullable().optional(),
  thankYouTitle: z.string().min(1).max(120).optional(),
  thankYouMessage: z.string().min(1).max(300).optional(),
  expiresAt: z.date().nullable().optional(),
  responseLimit: z.number().int().positive().nullable().optional(),
});

export const publishFormInputSchema = getFormByOwnerInputSchema;
export const unpublishFormInputSchema = getFormByOwnerInputSchema;

export const updateVisibilityInputSchema = getFormByOwnerInputSchema.extend({
  visibility: formVisibilitySchema,
});

export const updateSlugInputSchema = getFormByOwnerInputSchema.extend({
  slug: slugSchema,
});

export const getPublicFormBySlugInputSchema = z.object({
  slug: slugSchema.describe("The public form slug"),
});

export const getPublicRedirectByIdInputSchema = z.object({
  formId: z.string().uuid().describe("The legacy public form id"),
});

export const listPublicFormsInputSchema = z.undefined();

export type CreateFormInputSchemaType = z.infer<typeof createFormInputSchema>;
export type ListFromByUserIdInputSchemaType = z.infer<typeof listFromByUserIdInputSchema>;
export type GetFormByIdInputSchemaType = z.infer<typeof getFormByIdInputSchema>;
export type GetFormByOwnerInputSchemaType = z.infer<typeof getFormByOwnerInputSchema>;
export type UpdateFormInputSchemaType = z.infer<typeof updateFormInputSchema>;
export type PublishFormInputSchemaType = z.infer<typeof publishFormInputSchema>;
export type UnpublishFormInputSchemaType = z.infer<typeof unpublishFormInputSchema>;
export type UpdateVisibilityInputSchemaType = z.infer<typeof updateVisibilityInputSchema>;
export type UpdateSlugInputSchemaType = z.infer<typeof updateSlugInputSchema>;
export type GetPublicFormBySlugInputSchemaType = z.infer<typeof getPublicFormBySlugInputSchema>;
export type GetPublicRedirectByIdInputSchemaType = z.infer<typeof getPublicRedirectByIdInputSchema>;
export type ListPublicFormsInputSchemaType = z.infer<typeof listPublicFormsInputSchema>;
