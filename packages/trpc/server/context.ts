import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { clearCookieFactory, createCookieFactory, getCookieFactory } from "./utils/cookie";

export interface TRPCCtxUser {
  id: string;
}

export interface TRPCContext {
  createCookie: ReturnType<typeof createCookieFactory>;
  getCookie: ReturnType<typeof getCookieFactory>;
  clearCookie: ReturnType<typeof clearCookieFactory>;
  user?: TRPCCtxUser;
  requestMeta: {
    ip?: string;
    userAgent?: string;
  };
}
export async function createContext({ req, res }: CreateExpressContextOptions) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (forwardedFor?.split(",")[0] ?? req.ip ?? req.socket.remoteAddress);
  const userAgent = req.headers["user-agent"];

  const ctx: TRPCContext = {
    createCookie: createCookieFactory(res),
    getCookie: getCookieFactory(req),
    clearCookie: clearCookieFactory(res),
    user: undefined,
    requestMeta: { ip, userAgent },
  };
  return ctx;
}
export type Context = Awaited<ReturnType<typeof createContext>>;
