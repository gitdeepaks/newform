import { z } from "zod";
import { env } from "../env";
import { oauthProfileSchema } from "./model";

const githubTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  scope: z.string().optional(),
});

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatar_url: z.url().optional(),
});

const githubEmailSchema = z.object({
  email: z.email(),
  primary: z.boolean(),
  verified: z.boolean(),
  visibility: z.string().nullable(),
});

export function getGitHubAuthorizationUrl(state: string) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GITHUB_OAUTH_REDIRECT_URI);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function getGitHubOAuthProfile(code: string) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("GitHub token exchange failed");
  }

  const token = githubTokenResponseSchema.parse(await tokenResponse.json());
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token.access_token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const [userResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);

  if (!userResponse.ok || !emailsResponse.ok) {
    throw new Error("GitHub profile fetch failed");
  }

  const user = githubUserSchema.parse(await userResponse.json());
  const emails = z.array(githubEmailSchema).parse(await emailsResponse.json());
  const primaryVerifiedEmail = emails.find((email) => email.primary && email.verified);

  if (!primaryVerifiedEmail) {
    throw new Error("GitHub account does not have a verified primary email");
  }

  return oauthProfileSchema.parse({
    provider: "github",
    providerAccountId: String(user.id),
    email: primaryVerifiedEmail.email,
    emailVerified: true,
    fullName: user.name ?? user.login,
    profileImageUrl: user.avatar_url,
  });
}
