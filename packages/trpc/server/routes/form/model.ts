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

export const submitPublicResponseInputSchema = z.object({
  slug: slugSchema.describe("The public form slug"),
  values: z.array(submissionValueSchema).describe("The submitted answers for the form fields"),
  honeypot: z.string().optional().describe("Hidden spam protection field"),
});

export const submitPublicResponseOutputSchema = submitFormOutputSchema;

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

export const listResponsesInputSchema = z.object({
  formId: z.string().describe("The id of the form whose responses to fetch"),
  page: z.number().int().min(1).default(1).describe("The response page number"),
  pageSize: z.number().int().min(1).max(100).default(20).describe("The number of responses per page"),
});

const responseMetadataSchema = z
  .object({
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    slug: z.string().optional(),
  })
  .nullable();

export const listResponsesOutputSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(),
      options: z.array(z.object({ id: z.string(), label: z.string(), value: z.string() })).nullable(),
      validation: z
        .object({
          minLength: z.number().int().nonnegative().optional(),
          maxLength: z.number().int().positive().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          ratingMax: z.number().int().optional(),
          dateMin: z.string().optional(),
          dateMax: z.string().optional(),
        })
        .nullable(),
    }),
  ),
  responses: z.array(
    z.object({
      id: z.string(),
      respondentEmail: z.string().nullable(),
      values: z.array(submissionValueSchema).nullable(),
      metadata: responseMetadataSchema,
      submittedAt: z.date().nullable(),
      createdAt: z.date().nullable(),
    }),
  ),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const getFormAnalyticsInputSchema = z.object({
  formId: z.string().describe("The id of the form whose analytics to fetch"),
});

export const getFormAnalyticsOutputSchema = z.object({
  totalResponses: z.number(),
  totalSubmissions: z.number(),
  totalViews: z.number(),
  completionRate: z.number(),
  submissionsByDay: z.array(z.object({ date: z.string(), count: z.number() })),
  fieldBreakdown: z.array(
    z.object({
      fieldId: z.string(),
      label: z.string(),
      type: z.string(),
      responseCount: z.number(),
      options: z.array(z.object({ label: z.string(), value: z.string(), count: z.number() })).optional(),
      averageRating: z.number().optional(),
    }),
  ),
});

export const exportResponsesCsvInputSchema = z.object({
  formId: z.string().describe("The id of the form whose responses to export"),
});

export const exportResponsesCsvOutputSchema = z.object({
  filename: z.string(),
  csv: z.string(),
});

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
  id: z.string().min(1).max(80).describe("The option id"),
  label: z.string().min(1).max(80).describe("The option label"),
  value: z.string().min(1).max(80).describe("The option value"),
});

export const formFieldValidationSchema = z.object({
  minLength: z.number().int().nonnegative().optional().describe("Minimum text length"),
  maxLength: z.number().int().positive().optional().describe("Maximum text length"),
  min: z.number().optional().describe("Minimum number value"),
  max: z.number().optional().describe("Maximum number value"),
  ratingMax: z.number().int().min(2).max(10).optional().describe("Maximum rating value"),
  dateMin: z.string().optional().describe("Minimum date"),
  dateMax: z.string().optional().describe("Maximum date"),
});

export const formFieldSchema = z.object({
  id: z.string().describe("The id of the form field"),
  label: z.string().describe("The label of the form field"),
  description: z.string().nullable().describe("The description of the form field"),
  labelKey: z.string().describe("The stable key generated from the original label"),
  placeholder: z.string().nullable().describe("The placeholder of the form field"),
  isRequired: z.boolean().nullable().describe("Whether the form field is required"),
  index: z.string().describe("The fractional index used to sort the form field"),
  type: formFieldTypeSchema.describe("The type of the form field"),
  options: z.array(formFieldOptionSchema).nullable().describe("Options for option-based fields"),
  validation: formFieldValidationSchema.nullable().describe("Validation rules for the field"),
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
  options: z.array(formFieldOptionSchema).nullable().optional().describe("Options for option-based fields"),
  validation: formFieldValidationSchema.nullable().optional().describe("Validation rules for the field"),
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
  options: z.array(formFieldOptionSchema).nullable().optional().describe("Options for option-based fields"),
  validation: formFieldValidationSchema.nullable().optional().describe("Validation rules for the field"),
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
