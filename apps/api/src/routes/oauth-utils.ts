import type { Response } from "express";
import { randomBytes } from "node:crypto";
import {
  AUTHENTICATION_COOKIE_NAME,
  defaultCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
} from "@repo/trpc/server/utils/cookie";

const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000;

export function createOAuthState() {
  return randomBytes(32).toString("hex");
}

export function setOAuthStateCookie(res: Response, state: string) {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    ...defaultCookieOptions,
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

export function clearOAuthStateCookie(res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: "/" });
}

export function setAuthenticationTokenCookie(res: Response, token: string) {
  res.cookie(AUTHENTICATION_COOKIE_NAME, token, defaultCookieOptions);
}
