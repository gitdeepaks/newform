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
