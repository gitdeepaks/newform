import { z } from "zod";

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(55).describe("The title of the form"),
  description: z.string().max(300).optional().describe("The description of the form"),
});

export const createFormOutputSchema = z.object({
  id: z.string().describe("The id of the form"),
});

export const listFormsInputSchema = z.undefined();

export const listFormsOutputSchema = z.array(
  z.object({
    id: z.string().describe("The id of the form"),
    title: z.string().describe("The title of the form"),
    description: z.string().nullable().describe("The description of the form"),
    createdAt: z.date().nullable().describe("The date the form was created"),
    updatedAt: z.date().nullable().describe("The date the form was last updated"),
  }),
);
