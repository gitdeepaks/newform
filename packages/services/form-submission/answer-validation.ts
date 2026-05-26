import type { FormFieldOption, FormFieldValidation } from "@repo/database/schema";
import { z } from "zod";

const stringArraySchema = z.array(z.string());

export type PublicField = {
  id: string;
  type: string;
  isRequired: boolean | null;
  options: FormFieldOption[] | null;
  validation: FormFieldValidation | null;
};

export function parseJsonArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return stringArraySchema.parse(parsed);
  } catch {
    throw new Error("Invalid multi-select value");
  }
}

export function parseStringArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return stringArraySchema.parse(parsed);
  } catch {
    return [];
  }
}

export function validateAnswer(field: PublicField, value: string) {
  const validation = field.validation;
  const options = field.options ?? [];
  const optionValues = new Set(options.map((option) => option.value));
  const isRequired = field.isRequired === true;

  if (field.type === "EMAIL" && value && !z.string().email().safeParse(value).success) {
    throw new Error("Invalid email address");
  }

  if (field.type === "NUMBER") {
    if (!value) return;
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) throw new Error("Invalid number value");
    if (validation?.min !== undefined && numberValue < validation.min)
      throw new Error("Number is too small");
    if (validation?.max !== undefined && numberValue > validation.max)
      throw new Error("Number is too large");
  }

  if (field.type === "SHORT_TEXT" || field.type === "LONG_TEXT") {
    if (validation?.minLength !== undefined && value.length < validation.minLength) {
      throw new Error("Text is too short");
    }
    if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
      throw new Error("Text is too long");
    }
  }

  if (field.type === "SINGLE_SELECT" && value && !optionValues.has(value)) {
    throw new Error("Invalid option value");
  }

  if (field.type === "MULTI_SELECT") {
    const values = value ? parseJsonArray(value) : [];
    if (isRequired && values.length === 0) throw new Error("Please complete all required fields");
    if (values.some((selectedValue) => !optionValues.has(selectedValue))) {
      throw new Error("Invalid option value");
    }
  }

  if (field.type === "CHECKBOX") {
    if (options.length > 0) {
      const values = value ? parseJsonArray(value) : [];
      if (isRequired && values.length === 0) throw new Error("Please complete all required fields");
      if (values.some((selectedValue) => !optionValues.has(selectedValue))) {
        throw new Error("Invalid checkbox value");
      }
    } else if (value !== "true" && value !== "false") {
      throw new Error("Invalid checkbox value");
    }
  }

  if (field.type === "RATING") {
    if (!value) return;
    const rating = Number(value);
    const ratingMax = validation?.ratingMax ?? 5;
    if (!Number.isFinite(rating) || rating < 1 || rating > ratingMax) {
      throw new Error("Invalid rating value");
    }
  }

  if (field.type === "DATE") {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date value");
    if (validation?.dateMin && value < validation.dateMin) throw new Error("Date is too early");
    if (validation?.dateMax && value > validation.dateMax) throw new Error("Date is too late");
  }
}
