import { z } from "zod";

export const formFieldTypeSchema = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "NUMBER",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RATING",
  "DATE",
]);

export const formFieldOptionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(80),
});

export const formFieldValidationSchema = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  ratingMax: z.number().int().min(2).max(10).optional(),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
});

export const createFieldInputSchema = z.object({
  userId: z.string().describe("The id of the user creating the field"),
  label: z.string().min(1).max(100).describe("The label of the form field"),
  description: z.string().optional().describe("The description of the form field"),
  placeholder: z.string().optional().describe("The placeholder of the form field"),
  isRequired: z.boolean().optional().describe("Whether the form field is required"),
  index: z.string().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.describe("The type of the form field"),
  formId: z.string().describe("The id of the form this field belongs to"),
  options: z.array(formFieldOptionSchema).nullable().optional(),
  validation: formFieldValidationSchema.nullable().optional(),
});

export const updateFieldInputSchema = z.object({
  userId: z.string().describe("The id of the user updating the field"),
  id: z.string().describe("The id of the form field"),
  label: z.string().min(1).max(100).optional().describe("The label of the form field"),
  description: z.string().optional().nullable().describe("The description of the form field"),
  placeholder: z.string().optional().nullable().describe("The placeholder of the form field"),
  isRequired: z.boolean().optional().describe("Whether the form field is required"),
  index: z.string().optional().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.optional().describe("The type of the form field"),
  options: z.array(formFieldOptionSchema).nullable().optional(),
  validation: formFieldValidationSchema.nullable().optional(),
});

export const deleteFieldInputSchema = z.object({
  userId: z.string().describe("The id of the user deleting the field"),
  id: z.string().describe("The id of the form field"),
});

export const getFieldsInputSchema = z.object({
  userId: z.string().describe("The id of the user reading the fields"),
  formId: z.string().describe("The id of the form"),
});

export type CreateFieldInputSchemaType = z.infer<typeof createFieldInputSchema>;
export type UpdateFieldInputSchemaType = z.infer<typeof updateFieldInputSchema>;
export type DeleteFieldInputSchemaType = z.infer<typeof deleteFieldInputSchema>;
export type GetFieldsInputSchemaType = z.infer<typeof getFieldsInputSchema>;
export type FormFieldTypeSchemaType = z.infer<typeof formFieldTypeSchema>;
export type FormFieldOptionSchemaType = z.infer<typeof formFieldOptionSchema>;
export type FormFieldValidationSchemaType = z.infer<typeof formFieldValidationSchema>;
