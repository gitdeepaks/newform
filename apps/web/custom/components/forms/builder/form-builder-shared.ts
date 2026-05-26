import { useFields, useOwnerForm } from "@/hooks/api/form";
import { z } from "zod";

export const fieldTypes = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "NUMBER",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RATING",
  "DATE",
] as const;

export const fieldSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(100, "Label must be 100 characters or less"),
    description: z.string().trim().optional(),
    placeholder: z.string().trim().optional(),
    isRequired: z.boolean(),
    type: z.enum(fieldTypes),
    pageIndex: z.string(),
    hasVisibilityCondition: z.boolean(),
    conditionSourceFieldId: z.string().optional(),
    conditionOperator: z.enum(["equals", "not_equals"]).optional(),
    conditionValue: z.string().optional(),
    optionsText: z.string().optional(),
    minLength: z.string().optional(),
    maxLength: z.string().optional(),
    min: z.string().optional(),
    max: z.string().optional(),
    ratingMax: z.string().optional(),
    dateMin: z.string().optional(),
    dateMax: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.hasVisibilityCondition) return;
    if (!values.conditionSourceFieldId)
      ctx.addIssue({
        code: "custom",
        path: ["conditionSourceFieldId"],
        message: "Source field is required",
      });
    if (!values.conditionOperator)
      ctx.addIssue({
        code: "custom",
        path: ["conditionOperator"],
        message: "Operator is required",
      });
    if (!values.conditionValue)
      ctx.addIssue({ code: "custom", path: ["conditionValue"], message: "Value is required" });
  });

export const settingsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(55),
  description: z.string().trim().max(300).optional(),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  visibility: z.enum(["public", "unlisted"]),
  thankYouTitle: z.string().trim().min(1).max(120),
  thankYouMessage: z.string().trim().min(1).max(300),
  expiresAt: z.string().optional(),
  responseLimit: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0;
    }, "Use a positive whole number"),
});

export type FieldValues = z.infer<typeof fieldSchema>;
export type FieldType = FieldValues["type"];
export type SettingsValues = z.infer<typeof settingsSchema>;
export type OwnerForm = NonNullable<ReturnType<typeof useOwnerForm>["form"]>;
export type BuilderField = NonNullable<ReturnType<typeof useFields>["fields"]>[number];
export type ThemeTokens = NonNullable<OwnerForm["theme"]>["tokens"];

export type FieldOption = {
  id: string;
  label: string;
  value: string;
};

export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  ratingMax?: number;
  dateMin?: string;
  dateMax?: string;
};

export type FieldVisibilityCondition = {
  sourceFieldId: string;
  operator: "equals" | "not_equals";
  value: string;
};

export const defaultFieldValues: FieldValues = {
  label: "",
  description: "",
  placeholder: "",
  isRequired: false,
  type: "SHORT_TEXT",
  pageIndex: "0",
  hasVisibilityCondition: false,
  conditionSourceFieldId: "",
  conditionOperator: "equals",
  conditionValue: "",
  optionsText: "",
  minLength: "",
  maxLength: "",
  min: "",
  max: "",
  ratingMax: "5",
  dateMin: "",
  dateMax: "",
};

export const optionFieldTypes = new Set<FieldType>(["SINGLE_SELECT", "MULTI_SELECT", "CHECKBOX"]);
const conditionSourceFieldTypes = new Set<FieldType>(["SINGLE_SELECT", "CHECKBOX", "RATING"]);

export function canBeConditionSource(field: BuilderField): boolean {
  if (!conditionSourceFieldTypes.has(field.type)) return false;
  return field.type !== "CHECKBOX" || (field.options?.length ?? 0) === 0;
}

export const formatFieldType = (type: string) =>
  type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const slugifyOption = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const parseOptions = (type: FieldType, optionsText?: string): FieldOption[] | null => {
  if (!optionFieldTypes.has(type)) return null;

  const uniqueOptions = new Map<string, FieldOption>();
  for (const line of (optionsText ?? "").split("\n")) {
    const label = line.trim();
    const value = slugifyOption(label);
    if (!label || !value || uniqueOptions.has(value)) continue;
    uniqueOptions.set(value, { id: value, label, value });
  }

  return Array.from(uniqueOptions.values());
};

const optionalNumber = (value?: string) => {
  if (!value || value.trim() === "") return undefined;
  return Number(value);
};

export const buildValidation = (values: FieldValues): FieldValidation | null => {
  const validation: FieldValidation = {};

  if (values.type === "SHORT_TEXT" || values.type === "LONG_TEXT") {
    validation.minLength = optionalNumber(values.minLength);
    validation.maxLength = optionalNumber(values.maxLength);
  }

  if (values.type === "NUMBER") {
    validation.min = optionalNumber(values.min);
    validation.max = optionalNumber(values.max);
  }

  if (values.type === "RATING") validation.ratingMax = optionalNumber(values.ratingMax);

  if (values.type === "DATE") {
    validation.dateMin = values.dateMin || undefined;
    validation.dateMax = values.dateMax || undefined;
  }

  const hasValues = Object.values(validation).some((value) => value !== undefined && value !== "");
  return hasValues ? validation : null;
};

export const optionsToText = (options: FieldOption[] | null) =>
  options?.map((option) => option.label).join("\n") ?? "";

export const validationToFieldValues = (validation: FieldValidation | null) => ({
  minLength: validation?.minLength?.toString() ?? "",
  maxLength: validation?.maxLength?.toString() ?? "",
  min: validation?.min?.toString() ?? "",
  max: validation?.max?.toString() ?? "",
  ratingMax: validation?.ratingMax?.toString() ?? "5",
  dateMin: validation?.dateMin ?? "",
  dateMax: validation?.dateMax ?? "",
});

export function buildVisibilityCondition(values: FieldValues): FieldVisibilityCondition | null {
  if (!values.hasVisibilityCondition) return null;
  if (!values.conditionSourceFieldId || !values.conditionOperator || !values.conditionValue)
    return null;
  return {
    sourceFieldId: values.conditionSourceFieldId,
    operator: values.conditionOperator,
    value: values.conditionValue,
  };
}

export function getPageIndexes(fields: BuilderField[] | undefined): number[] {
  const indexes = new Set<number>([0]);
  for (const field of fields ?? []) indexes.add(field.pageIndex ?? 0);
  return Array.from(indexes).sort((a, b) => a - b);
}

export function getFieldsForPage(
  fields: BuilderField[] | undefined,
  pageIndex: number,
): BuilderField[] {
  return (fields ?? []).filter((field) => (field.pageIndex ?? 0) === pageIndex);
}

export function dateToDateTimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function dateTimeLocalValueToDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function responseLimitValueToNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
