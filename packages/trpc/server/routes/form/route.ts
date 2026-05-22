import { formService } from "../../services";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createFormInputSchema,
  createFormOutputSchema,
  listFormsInputSchema,
  listFormsOutputSchema,
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
});
