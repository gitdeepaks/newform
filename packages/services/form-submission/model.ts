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

export const getSubmissionsByFormIdInputSchema = z.object({
  formId: z.string().describe("The id of the form whose submissions to fetch"),
});

export type CreateSubmissionInputSchemaType = z.infer<typeof createSubmissionInputSchema>;
export type GetSubmissionsByFormIdInputSchemaType = z.infer<
  typeof getSubmissionsByFormIdInputSchema
>;
