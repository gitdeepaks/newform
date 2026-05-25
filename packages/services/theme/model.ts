import { z } from "zod";

export const themeTokensSchema = z.object({
  background: z.string().min(1),
  card: z.string().min(1),
  text: z.string().min(1),
  mutedText: z.string().min(1),
  accent: z.string().min(1),
  accentText: z.string().min(1),
  border: z.string().min(1),
});

export const listThemesInputSchema = z.object({ userId: z.string().optional() }).optional();
export const getThemeInputSchema = z.object({ themeId: z.string() });
export const assignThemeInputSchema = z.object({
  formId: z.string(),
  userId: z.string(),
  themeId: z.string(),
});

export type ThemeTokensSchemaType = z.infer<typeof themeTokensSchema>;
export type ListThemesInputSchemaType = z.infer<typeof listThemesInputSchema>;
export type GetThemeInputSchemaType = z.infer<typeof getThemeInputSchema>;
export type AssignThemeInputSchemaType = z.infer<typeof assignThemeInputSchema>;
