import { z } from "zod";

export const userRoleSchema = z.enum(["user", "admin"]);
export const userStatusSchema = z.enum(["active", "suspended"]);
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const createUserWithEmailAndPasswordInputSchema = z.object({
  fullName: z.string().min(1).max(80).describe("The full name of the user"),
  email: z.email().describe("The email of the user"),
  password: z.string().min(8).describe("The password of the user"),
});
export type CreateUserWithEmailAndPasswordInputSchemaType = z.infer<
  typeof createUserWithEmailAndPasswordInputSchema
>;

export const generateUserTokenPayload = z.object({
  id: z.string().describe("The id of the user"),
});

export type GenerateUserTokenPayloadType = z.infer<typeof generateUserTokenPayload>;

export const signInUserWithEmailAndPasswordInputSchema = z.object({
  email: z.email().describe("The email of the user"),
  password: z.string().min(8).describe("The password of the user"),
});

export type SignInUserWithEmailAndPasswordInputSchemaType = z.infer<
  typeof signInUserWithEmailAndPasswordInputSchema
>;

export const oauthProviderSchema = z.enum(["google", "github"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

export const findOrCreateOAuthUserInputSchema = z.object({
  provider: oauthProviderSchema,
  providerAccountId: z.string().trim().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  fullName: z.string().trim().min(1).max(80),
  profileImageUrl: z.url().optional(),
});

export type FindOrCreateOAuthUserInput = z.infer<typeof findOrCreateOAuthUserInputSchema>;
