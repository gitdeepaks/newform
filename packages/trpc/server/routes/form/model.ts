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

export const submissionValueSchema = z.object({
  formFieldId: z.string().describe("The id of the form field being answered"),
  value: z.string().describe("The submitted value for the form field"),
});

export const submitFormInputSchema = z.object({
  formId: z.string().describe("The id of the form being submitted"),
  values: z.array(submissionValueSchema).describe("The submitted answers for the form fields"),
});

export const submitFormOutputSchema = z.object({
  id: z.string().describe("The id of the created submission"),
});

export const getSubmissionsInputSchema = z.object({
  formId: z.string().describe("The id of the form whose submissions to fetch"),
});

export const getSubmissionsOutputSchema = z.array(
  z.object({
    id: z.string().describe("The id of the submission"),
    formId: z.string().nullable().describe("The id of the form this submission belongs to"),
    values: z
      .array(submissionValueSchema)
      .nullable()
      .describe("The submitted answers for the form fields"),
    createdAt: z.date().nullable().describe("The date the submission was created"),
    updatedAt: z.date().nullable().describe("The date the submission was last updated"),
  }),
);

export const formFieldTypeSchema = z.enum(["TEXT", "NUMBER", "EMAIL", "YES_NO", "PASSWORD"]);

export const formFieldSchema = z.object({
  id: z.string().describe("The id of the form field"),
  label: z.string().describe("The label of the form field"),
  description: z.string().nullable().describe("The description of the form field"),
  labelKey: z.string().describe("The stable key generated from the original label"),
  placeholder: z.string().nullable().describe("The placeholder of the form field"),
  isRequired: z.boolean().nullable().describe("Whether the form field is required"),
  index: z.string().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.describe("The type of the form field"),
  formId: z.string().nullable().describe("The id of the form this field belongs to"),
  createdAt: z.date().nullable().describe("The date the form field was created"),
  updatedAt: z.date().nullable().describe("The date the form field was last updated"),
});

export const getFormInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
});

export const getFormOutputSchema = z.object({
  id: z.string().describe("The id of the form"),
  title: z.string().describe("The title of the form"),
  description: z.string().nullable().describe("The description of the form"),
  fields: z.array(formFieldSchema).describe("The fields belonging to the form"),
});

export const createFieldInputSchema = z.object({
  label: z.string().min(1).max(100).describe("The label of the form field"),
  description: z.string().optional().describe("The description of the form field"),
  placeholder: z.string().optional().describe("The placeholder of the form field"),
  isRequired: z.boolean().optional().describe("Whether the form field is required").default(false),
  index: z.string().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.describe("The type of the form field"),
  formId: z.string().describe("The id of the form this field belongs to"),
});

export const createFieldOutputSchema = z.object({
  id: z.string().describe("The id of the form field"),
});

export const getFieldsInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
});

export const getFieldsOutputSchema = z.array(formFieldSchema);

export const updateFieldInputSchema = z.object({
  id: z.string().describe("The id of the form field"),
  label: z.string().min(1).max(100).optional().describe("The label of the form field"),
  description: z.string().optional().nullable().describe("The description of the form field"),
  placeholder: z.string().optional().nullable().describe("The placeholder of the form field"),
  isRequired: z.boolean().optional().describe("Whether the form field is required"),
  index: z.string().optional().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.optional().describe("The type of the form field"),
});

export const updateFieldOutputSchema = z.object({
  id: z.string().describe("The id of the form field"),
});

export const deleteFieldInputSchema = z.object({
  id: z.string().describe("The id of the form field"),
});

export const deleteFieldOutputSchema = z.object({
  id: z.string().describe("The id of the deleted form field"),
});
