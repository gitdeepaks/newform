import { z } from "zod";

const stringArraySchema = z.array(z.string());

export function parseStringArray(value: string) {
  try {
    return stringArraySchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}
