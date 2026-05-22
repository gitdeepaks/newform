import { z } from "zod";

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(55).describe("The title of the form"),
  description: z.string().max(300).optional().describe("The description of the form"),
  createdBy: z.string().describe("The id of the user creating the form"),
});

export type CreateFormInputSchemaType = z.infer<typeof createFormInputSchema>;
