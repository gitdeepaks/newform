import { TRPCError } from "@trpc/server";
import { userService } from "../../services";

import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { getAuthenticationCookie, setAuthenticationCookie } from "../../utils/cookie";
import { generatePath } from "../../utils/path-generator";
import {
  createUserWithEmailAndPasswordInputSchema,
  createUserWithEmailAndPasswordOutputSchema,
  getLoggedInputUserInfoInputModel,
  getLoggedInputUserInfoOutputModel,
  signInUserWithEmailAndPasswordInputSchema,
  signInUserWithEmailAndPasswordOutputSchema,
} from "./model";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  createUserWithEmailAndPassword: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/createUserWithEmailAndPassword"),
        tags: TAGS,
      },
    })
    .input(createUserWithEmailAndPasswordInputSchema)
    .output(createUserWithEmailAndPasswordOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const { fullName, email, password } = input;
      const { id, token } = await userService.createUserWithEmailAndPassword({
        fullName,
        email,
        password,
      });
      setAuthenticationCookie(ctx, token);
      return {
        id,
      };
    }),

  signInUserWithEmailAndPassword: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/signInUserWithEmailAndPassword"),
        tags: TAGS,
      },
    })
    .input(signInUserWithEmailAndPasswordInputSchema)
    .output(signInUserWithEmailAndPasswordOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      const { id, token } = await userService.singnInUserWithEmailAndPassword({
        email,
        password,
      });

      setAuthenticationCookie(ctx, token);

      return {
        id,
      };
    }),

  getLoggedInUserInfo: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getLoggedInUserInfo"),
        tags: TAGS,
        protect: true,
      },
    })
    .input(getLoggedInputUserInfoInputModel)
    .output(getLoggedInputUserInfoOutputModel)
    .query(async ({ ctx }) => {
      const token = getAuthenticationCookie(ctx);
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not logged in" });

      const { id, email, profileImageUrl, fullName } = await userService.getUserInfoById(
        ctx.user.id,
      );

      return { id, email, profileImageUrl, fullName };
    }),
});
