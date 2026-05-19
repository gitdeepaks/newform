import { z } from "zod";

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
