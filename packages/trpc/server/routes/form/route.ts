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
  getSubmissionsInputSchema,
  getSubmissionsOutputSchema,
  listFormsInputSchema,
  listFormsOutputSchema,
  submitFormInputSchema,
  submitFormOutputSchema,
  updateFieldInputSchema,
  updateFieldOutputSchema,
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
      const { id } = await formService.createForm({
        title,
        description,
        createdBy: ctx.user.id,
      });

      return { id };
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
