import { z } from "zod";

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(55).describe("The title of the form"),
  description: z.string().max(300).optional().describe("The description of the form"),
});

export const createFormOutputSchema = z.object({
  id: z.string().describe("The id of the form"),
  slug: z.string().describe("The slug of the form"),
});

export const listFormsInputSchema = z.undefined();

export const formStatusSchema = z.enum(["draft", "published", "archived"]);
export const formVisibilitySchema = z.enum(["public", "unlisted"]);
export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const listFormsOutputSchema = z.array(
  z.object({
    id: z.string().describe("The id of the form"),
    title: z.string().describe("The title of the form"),
    description: z.string().nullable().describe("The description of the form"),
    slug: z.string().describe("The slug of the form"),
    status: z.string().describe("The status of the form"),
    visibility: z.string().describe("The visibility of the form"),
    publishedAt: z.date().nullable().describe("The date the form was published"),
    createdAt: z.date().nullable().describe("The date the form was created"),
    updatedAt: z.date().nullable().describe("The date the form was last updated"),
  }),
);

export const updateFormInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
  title: z.string().min(1).max(55).optional().describe("The title of the form"),
  description: z.string().max(300).nullable().optional().describe("The description of the form"),
  thankYouTitle: z.string().min(1).max(120).optional().describe("The thank you title"),
  thankYouMessage: z.string().min(1).max(300).optional().describe("The thank you message"),
  expiresAt: z.date().nullable().optional().describe("The date the form expires"),
  responseLimit: z.number().int().positive().nullable().optional().describe("The response limit"),
});

export const lifecycleFormIdInputSchema = z.object({
  formId: z.string().describe("The id of the form"),
});

export const updateVisibilityInputSchema = lifecycleFormIdInputSchema.extend({
  visibility: formVisibilitySchema.describe("The form visibility"),
});

export const updateSlugInputSchema = lifecycleFormIdInputSchema.extend({
  slug: slugSchema.describe("The form slug"),
});

export const lifecycleOutputSchema = z.object({
  id: z.string().describe("The id of the form"),
});

export const updateSlugOutputSchema = z.object({
  id: z.string().describe("The id of the form"),
  slug: z.string().describe("The updated slug"),
});

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

export const getPublicFormBySlugInputSchema = z.object({
  slug: slugSchema.describe("The public form slug"),
});

export const getFormOutputSchema = z.object({
  id: z.string().describe("The id of the form"),
  title: z.string().describe("The title of the form"),
  description: z.string().nullable().describe("The description of the form"),
  slug: z.string().describe("The slug of the form"),
  status: z.string().describe("The status of the form"),
  visibility: z.string().describe("The visibility of the form"),
  thankYouTitle: z.string().nullable().describe("The thank you title"),
  thankYouMessage: z.string().nullable().describe("The thank you message"),
  publishedAt: z.date().nullable().describe("The published date"),
  expiresAt: z.date().nullable().describe("The expiration date"),
  responseLimit: z.number().nullable().describe("The response limit"),
  fields: z.array(formFieldSchema).describe("The fields belonging to the form"),
});

export const listPublicFormsInputSchema = z.undefined();

export const listPublicFormsOutputSchema = z.array(
  z.object({
    id: z.string().describe("The id of the form"),
    title: z.string().describe("The title of the form"),
    description: z.string().nullable().describe("The description of the form"),
    slug: z.string().describe("The form slug"),
    publishedAt: z.date().nullable().describe("The published date"),
  }),
);

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
