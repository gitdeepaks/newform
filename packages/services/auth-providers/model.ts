import { z } from "zod";
import { oauthProviderSchema } from "../user/model";

export const oauthProfileSchema = z.object({
  provider: oauthProviderSchema,
  providerAccountId: z.string().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  fullName: z.string().min(1).max(80),
  profileImageUrl: z.url().optional(),
});

export type OAuthProfile = z.infer<typeof oauthProfileSchema>;
