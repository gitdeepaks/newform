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
  const user = await userService.getUserInfoById(id);

  if (user.status === "suspended") {
    throw new TRPCError({ code: "FORBIDDEN", message: "User account is suspended" });
  }

  return options.next({
    ctx: {
      ...ctx,
      user: { id: user.id, role: user.role, status: user.status },
    },
  });
});

export const adminProcedure = protectedProcedure.use(async (options) => {
  if (options.ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return options.next({ ctx: options.ctx });
});
