import { userService } from "../../services";

import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createUserWithEmailAndPasswordInputSchema,
  createUserWithEmailAndPasswordOutputSchema,
} from "./model";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  createUserWithEmailAndPassword: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/create-user-with-email-and-password"),
        tags: TAGS,
      },
    })
    .input(createUserWithEmailAndPasswordInputSchema)
    .output(createUserWithEmailAndPasswordOutputSchema)
    .mutation(async ({ input }) => {
      const { fullName, email, password } = input;
      const { id } = await userService.createUserWithEmailAndPassword({
        fullName,
        email,
        password,
      });
      return {
        id,
      };
    }),
});
