import { Router } from "express";
import { z } from "zod";
import UserService from "@repo/services/user";
import {
  getGitHubAuthorizationUrl,
  getGitHubOAuthProfile,
} from "@repo/services/auth-providers/github";
import {
  getGoogleAuthorizationUrl,
  getGoogleOAuthProfile,
} from "@repo/services/auth-providers/google";
import { isGitHubOAuthConfigured, isGoogleOAuthConfigured } from "@repo/services/env";
import { OAUTH_STATE_COOKIE_NAME } from "@repo/trpc/server/utils/cookie";
import { env } from "../env";
import {
  clearOAuthStateCookie,
  createOAuthState,
  setAuthenticationTokenCookie,
  setOAuthStateCookie,
} from "./oauth-utils";

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const userService = new UserService();
export const oauthRouter = Router();

function redirectToFailure(error: string) {
  const url = new URL("/login", env.WEB_APP_URL);
  url.searchParams.set("error", error);
  return url.toString();
}

function redirectToSuccess() {
  return new URL("/dashboard", env.WEB_APP_URL).toString();
}

function verifyState(queryState: string, cookieState: unknown) {
  return typeof cookieState === "string" && cookieState.length > 0 && cookieState === queryState;
}

oauthRouter.get("/google/start", (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    res.redirect(redirectToFailure("oauth_not_configured"));
    return;
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, state);
  res.redirect(getGoogleAuthorizationUrl(state));
});

oauthRouter.get("/github/start", (_req, res) => {
  if (!isGitHubOAuthConfigured()) {
    res.redirect(redirectToFailure("oauth_not_configured"));
    return;
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, state);
  res.redirect(getGitHubAuthorizationUrl(state));
});

oauthRouter.get("/google/callback", async (req, res) => {
  const query = callbackQuerySchema.safeParse(req.query);
  clearOAuthStateCookie(res);

  if (!query.success || !verifyState(query.data.state, req.cookies?.[OAUTH_STATE_COOKIE_NAME])) {
    res.redirect(redirectToFailure("oauth_state_invalid"));
    return;
  }

  try {
    const profile = await getGoogleOAuthProfile(query.data.code);
    const { token } = await userService.findOrCreateOAuthUser(profile);
    setAuthenticationTokenCookie(res, token);
    res.redirect(redirectToSuccess());
  } catch {
    res.redirect(redirectToFailure("oauth_failed"));
  }
});

oauthRouter.get("/github/callback", async (req, res) => {
  const query = callbackQuerySchema.safeParse(req.query);
  clearOAuthStateCookie(res);

  if (!query.success || !verifyState(query.data.state, req.cookies?.[OAUTH_STATE_COOKIE_NAME])) {
    res.redirect(redirectToFailure("oauth_state_invalid"));
    return;
  }

  try {
    const profile = await getGitHubOAuthProfile(query.data.code);
    const { token } = await userService.findOrCreateOAuthUser(profile);
    setAuthenticationTokenCookie(res, token);
    res.redirect(redirectToSuccess());
  } catch {
    res.redirect(redirectToFailure("oauth_failed"));
  }
});
