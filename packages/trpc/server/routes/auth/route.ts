import { TRPCError } from "@trpc/server";
import { isGitHubOAuthConfigured, isGoogleOAuthConfigured } from "@repo/services/env";
import { userService } from "../../services";

import { protectedProcedure, publicProcedure, router } from "../../trpc";
import {
  clearAuthenticationCookie,
  getAuthenticationCookie,
  setAuthenticationCookie,
} from "../../utils/cookie";
import { generatePath } from "../../utils/path-generator";
import {
  createUserWithEmailAndPasswordInputSchema,
  createUserWithEmailAndPasswordOutputSchema,
  getLoggedInputUserInfoInputModel,
  getLoggedInputUserInfoOutputModel,
  getOAuthProvidersOutputSchema,
  logoutOutputSchema,
  signInUserWithEmailAndPasswordInputSchema,
  signInUserWithEmailAndPasswordOutputSchema,
} from "./model";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  getOAuthProviders: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getOAuthProviders"),
        tags: TAGS,
      },
    })
    .input(getLoggedInputUserInfoInputModel)
    .output(getOAuthProvidersOutputSchema)
    .query(() => {
      const providers: Array<"google" | "github"> = [];
      if (isGoogleOAuthConfigured()) providers.push("google");
      if (isGitHubOAuthConfigured()) providers.push("github");
      return { providers };
    }),

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

      const { id, email, profileImageUrl, fullName, role, status } = await userService.getUserInfoById(
        ctx.user.id,
      );

      return { id, email, profileImageUrl, fullName, role, status };
    }),

  logout: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/logout"),
        tags: TAGS,
      },
    })
    .input(getLoggedInputUserInfoInputModel)
    .output(logoutOutputSchema)
    .mutation(({ ctx }) => {
      clearAuthenticationCookie(ctx);
      return { success: true };
    }),
});
