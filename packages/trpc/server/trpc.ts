import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";
import { getAuthenticationCookie } from "./utils/cookie";
import { userService } from "./services";

export const tRPCContext = initTRPC.meta<OpenApiMeta>().context<typeof createContext>().create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;
export const protectedProcedure = tRPCContext.procedure.use(async (options) => {
  const { ctx } = options;

  const token = getAuthenticationCookie(ctx);
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not logged in" });

  const { id } = await userService.verifyAndDecodeuserToken(token);

  return options.next({
    ctx: {
      ...ctx,
      user: { id },
    },
  });
});
