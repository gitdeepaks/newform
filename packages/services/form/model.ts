import { z } from "zod";

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

export type CreateFormInputSchemaType = z.infer<typeof createFormInputSchema>;
export type ListFromByUserIdInputSchemaType = z.infer<typeof listFromByUserIdInputSchema>;
export type GetFormByIdInputSchemaType = z.infer<typeof getFormByIdInputSchema>;
