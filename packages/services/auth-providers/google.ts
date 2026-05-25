import { z } from "zod";
import { googleOAuth2Client } from "../clients/google-oauth";
import { env } from "../env";
import { oauthProfileSchema } from "./model";

const googleIdTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().min(1).max(80),
  picture: z.url().optional(),
});

export function getGoogleAuthorizationUrl(state: string) {
  return googleOAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  });
}

export async function getGoogleOAuthProfile(code: string) {
  const { tokens } = await googleOAuth2Client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google OAuth response is missing id token");
  }

  const ticket = await googleOAuth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_OAUTH_CLIENT_ID,
  });

  const payload = googleIdTokenPayloadSchema.parse(ticket.getPayload());

  return oauthProfileSchema.parse({
    provider: "google",
    providerAccountId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    fullName: payload.name,
    profileImageUrl: payload.picture,
  });
}
