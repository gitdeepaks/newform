import { z } from "zod";

export const formFieldTypeSchema = z.enum(["TEXT", "NUMBER", "EMAIL", "YES_NO", "PASSWORD"]);

export const createFieldInputSchema = z.object({
  label: z.string().min(1).max(100).describe("The label of the form field"),
  description: z.string().optional().describe("The description of the form field"),
  placeholder: z.string().optional().describe("The placeholder of the form field"),
  isRequired: z.boolean().optional().describe("Whether the form field is required"),
  index: z.string().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.describe("The type of the form field"),
  formId: z.string().describe("The id of the form this field belongs to"),
});

export const updateFieldInputSchema = z.object({
  id: z.string().describe("The id of the form field"),
  label: z.string().min(1).max(100).optional().describe("The label of the form field"),
  description: z.string().optional().nullable().describe("The description of the form field"),
  placeholder: z.string().optional().nullable().describe("The placeholder of the form field"),
  isRequired: z.boolean().optional().describe("Whether the form field is required"),
  index: z.string().optional().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.optional().describe("The type of the form field"),
});

export const deleteFieldInputSchema = z.object({
  id: z.string().describe("The id of the form field"),
});

export const getFieldsInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
});

export type CreateFieldInputSchemaType = z.infer<typeof createFieldInputSchema>;
export type UpdateFieldInputSchemaType = z.infer<typeof updateFieldInputSchema>;
export type DeleteFieldInputSchemaType = z.infer<typeof deleteFieldInputSchema>;
export type GetFieldsInputSchemaType = z.infer<typeof getFieldsInputSchema>;
