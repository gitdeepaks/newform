import type { CookieOptions, Response, Request } from "express";
import type { TRPCContext } from "../context";

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

export const defaultCookieOptions: CookieOptions = {
  path: "/",
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: ONE_YEAR, // 1 year
};

export const clearCookieOptions: CookieOptions = {
  path: defaultCookieOptions.path,
  httpOnly: defaultCookieOptions.httpOnly,
  secure: defaultCookieOptions.secure,
  sameSite: defaultCookieOptions.sameSite,
};

export function createCookieFactory(res: Response) {
  return function createCookie(
    name: string,
    value: string,
    opts: CookieOptions = defaultCookieOptions,
  ) {
    res.cookie(name, value, opts);
  };
}

export function getCookieFactory(req: Request) {
  return function getCookie(name: string) {
    return req.cookies?.[name];
  };
}

export function clearCookieFactory(res: Response) {
  return function clearCookie(name: string, opts: CookieOptions = clearCookieOptions) {
    res.clearCookie(name, opts);
  };
}

// Authentication Cookies

export const AUTHENTICATION_COOKIE_NAME = "authentication-token";
export const OAUTH_STATE_COOKIE_NAME = "oauth-state";

export function setAuthenticationCookie(ctx: TRPCContext, accessToken: string) {
  ctx.createCookie(AUTHENTICATION_COOKIE_NAME, accessToken);
}

export function getAuthenticationCookie(ctx: TRPCContext) {
  return ctx.getCookie(AUTHENTICATION_COOKIE_NAME);
}

export function clearAuthenticationCookie(ctx: TRPCContext) {
  ctx.clearCookie(AUTHENTICATION_COOKIE_NAME);
}
