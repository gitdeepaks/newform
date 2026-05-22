import { formFieldService, formService } from "../../services";
import { protectedProcedure, router } from "../../trpc";
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
  listFormsInputSchema,
  listFormsOutputSchema,
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
