import { OAuth2Client } from "google-auth-library";
import { env } from "../env";

export function getGoogleOAuthConfig() {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

export function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  return new OAuth2Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirectUri,
  });
}
