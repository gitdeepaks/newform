import { formFieldService, formService, formSubmissionService } from "../../services";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createFieldInputSchema,
  createFieldOutputSchema,
  createFormInputSchema,
  createFormOutputSchema,
  deleteFieldInputSchema,
  deleteFieldOutputSchema,
  getFieldsInputSchema,
  getFieldsOutputSchema,
  getFormInputSchema,
  getFormOutputSchema,
  getPublicFormBySlugInputSchema,
  getSubmissionsInputSchema,
  getSubmissionsOutputSchema,
  lifecycleFormIdInputSchema,
  lifecycleOutputSchema,
  listPublicFormsInputSchema,
  listPublicFormsOutputSchema,
  listFormsInputSchema,
  listFormsOutputSchema,
  submitFormInputSchema,
  submitFormOutputSchema,
  updateFieldInputSchema,
  updateFieldOutputSchema,
  updateFormInputSchema,
  updateSlugInputSchema,
  updateSlugOutputSchema,
  updateVisibilityInputSchema,
} from "./model";

const TAGS = ["Form"];
const getPath = generatePath("/form");

export const formRouter = router({
  createForm: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/createForm"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(createFormInputSchema)
    .output(createFormOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const { title, description } = input;
      const { id, slug } = await formService.createForm({
        title,
        description,
        createdBy: ctx.user.id,
      });

      return { id, slug };
    }),

  getFormForOwner: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getFormForOwner"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(getFormInputSchema)
    .output(getFormOutputSchema)
    .query(async ({ input, ctx }) => {
      return formService.getFormByOwner({ formId: input.formId, userId: ctx.user.id });
    }),

  updateForm: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/updateForm"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(updateFormInputSchema)
    .output(lifecycleOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return formService.updateForm({ ...input, userId: ctx.user.id });
    }),

  publishForm: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/publishForm"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(lifecycleFormIdInputSchema)
    .output(updateSlugOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return formService.publishForm({ ...input, userId: ctx.user.id });
    }),

  unpublishForm: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/unpublishForm"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(lifecycleFormIdInputSchema)
    .output(lifecycleOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return formService.unpublishForm({ ...input, userId: ctx.user.id });
    }),

  updateVisibility: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/updateVisibility"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(updateVisibilityInputSchema)
    .output(lifecycleOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return formService.updateVisibility({ ...input, userId: ctx.user.id });
    }),

  updateSlug: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/updateSlug"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(updateSlugInputSchema)
    .output(updateSlugOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return formService.updateSlug({ ...input, userId: ctx.user.id });
    }),

  getForm: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getForm"),
        tags: TAGS,
      },
    })
    .input(getFormInputSchema)
    .output(getFormOutputSchema)
    .query(async ({ input }) => {
      const form = await formService.getFormById(input);
      return form;
    }),

  getPublicFormBySlug: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getPublicFormBySlug"),
        tags: TAGS,
      },
    })
    .input(getPublicFormBySlugInputSchema)
    .output(getFormOutputSchema)
    .query(async ({ input }) => {
      return formService.getPublicFormBySlug(input);
    }),

  listPublicForms: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/listPublicForms"),
        tags: TAGS,
      },
    })
    .input(listPublicFormsInputSchema)
    .output(listPublicFormsOutputSchema)
    .query(async ({ input }) => {
      return formService.listPublicForms(input);
    }),

  submitForm: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/submitForm"),
        tags: TAGS,
      },
    })
    .input(submitFormInputSchema)
    .output(submitFormOutputSchema)
    .mutation(async ({ input }) => {
      const { id } = await formSubmissionService.createSubmission(input);
      return { id };
    }),

  getSubmissions: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getSubmissions"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(getSubmissionsInputSchema)
    .output(getSubmissionsOutputSchema)
    .query(async ({ input }) => {
      const submissions = await formSubmissionService.getSubmissionsByFormId(input);
      return submissions;
    }),

  listForms: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/listForms"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(listFormsInputSchema)
    .output(listFormsOutputSchema)
    .query(async ({ ctx }) => {
      const forms = await formService.listFromByUserId({ userId: ctx.user.id });
      return forms;
    }),

  createField: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/createField"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(createFieldInputSchema)
    .output(createFieldOutputSchema)
    .mutation(async ({ input }) => {
      const { id } = await formFieldService.createField(input);
      return { id };
    }),

  getFields: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getFields"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(getFieldsInputSchema)
    .output(getFieldsOutputSchema)
    .query(async ({ input }) => {
      const fields = await formFieldService.getFields(input);
      return fields;
    }),

  updateField: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/updateField"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(updateFieldInputSchema)
    .output(updateFieldOutputSchema)
    .mutation(async ({ input }) => {
      const { id } = await formFieldService.updateField(input);
      return { id };
    }),

  deleteField: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/deleteField"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(deleteFieldInputSchema)
    .output(deleteFieldOutputSchema)
    .mutation(async ({ input }) => {
      const { id } = await formFieldService.deleteField(input);
      return { id };
    }),
});
