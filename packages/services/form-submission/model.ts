import { z } from "zod";

export const createSubmissionInputSchema = z.object({
  formId: z.string().describe("The id of the form being submitted"),
  values: z
    .array(
      z.object({
        formFieldId: z.string().describe("The id of the form field being answered"),
        value: z.string().describe("The submitted value for the form field"),
      }),
    )
    .describe("The submitted answers for the form fields"),
});

export const publicAnswerSchema = z.object({
  formFieldId: z.string(),
  value: z.string(),
});

export const submitPublicResponseInputSchema = z.object({
  slug: z.string().min(3).max(80),
  values: z.array(publicAnswerSchema),
  honeypot: z.string().optional(),
  metadata: z
    .object({
      ip: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

export const submitPublicResponseOutputSchema = z.object({
  id: z.string(),
});

export const getSubmissionsByFormIdInputSchema = z.object({
  formId: z.string().describe("The id of the form whose submissions to fetch"),
  userId: z.string().describe("The id of the user requesting submissions"),
});

export const listResponsesInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const getFormAnalyticsInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
});

export const exportResponsesCsvInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
});

export type CreateSubmissionInputSchemaType = z.infer<typeof createSubmissionInputSchema>;
export type SubmitPublicResponseInputSchemaType = z.infer<
  typeof submitPublicResponseInputSchema
>;
export type GetSubmissionsByFormIdInputSchemaType = z.infer<
  typeof getSubmissionsByFormIdInputSchema
>;
export type ListResponsesInputSchemaType = z.infer<typeof listResponsesInputSchema>;
export type GetFormAnalyticsInputSchemaType = z.infer<typeof getFormAnalyticsInputSchema>;
export type ExportResponsesCsvInputSchemaType = z.infer<typeof exportResponsesCsvInputSchema>;
