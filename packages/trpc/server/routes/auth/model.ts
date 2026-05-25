import { z } from "zod";

export const createUserWithEmailAndPasswordInputSchema = z.object({
  fullName: z.string().min(1).max(80).describe("The full name of the user"),
  email: z.email().describe("The email of the user"),
  password: z.string().min(8).describe("The password of the user"),
});

export const createUserWithEmailAndPasswordOutputSchema = z.object({
  id: z.string().describe("The id of the user"),
});

export const signInUserWithEmailAndPasswordInputSchema = z.object({
  email: z.email().describe("The email of the user"),
  password: z.string().min(8).describe("The password of the user"),
});

export const signInUserWithEmailAndPasswordOutputSchema = z.object({
  id: z.string().describe("The id of the user"),
});

export const getLoggedInUserInputSchema = z.object({
  id: z.string().describe("The id of the user"),
});

export const getLoggedInputUserInfoInputModel = z.undefined();

export const getLoggedInputUserInfoOutputModel = z.object({
  id: z.string().describe("The id of the user"),
  email: z.email().describe("The email of the user"),
  fullName: z.string().describe("The full name of the user"),
  profileImageUrl: z.string().optional().describe("The profile image url of the user"),
});

export const getOAuthProvidersOutputSchema = z.object({
  providers: z.array(z.enum(["google", "github"])),
});

export const logoutOutputSchema = z.object({
  success: z.boolean(),
});
