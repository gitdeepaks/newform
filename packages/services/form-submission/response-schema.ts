import type { FormVersionFieldSnapshot } from "@repo/database/schema";
import { z, type ZodError, type ZodType } from "zod";
import { responseInputValueSchema } from "./model";

export type ResponseInputValue = z.infer<typeof responseInputValueSchema> | undefined;

export type FieldValidationError = {
  fieldId: string;
  fieldKey: string;
  message: string;
};

export type NormalizedAnswerValue = {
  rawValue: string | string[] | number | boolean | null;
  normalizedText: string | null;
  normalizedNumber: string | null;
  normalizedDate: Date | null;
  optionValues: string[] | null;
};

export class ResponseValidationError extends Error {
  public readonly fieldErrors: FieldValidationError[];

  public constructor(fieldErrors: FieldValidationError[]) {
    super(fieldErrors[0]?.message ?? "Invalid response");
    this.name = "ResponseValidationError";
    this.fieldErrors = fieldErrors;
  }
}

const stringArraySchema = z.array(z.string());
const responseObjectSchema = z.record(z.string(), responseInputValueSchema.optional());

function isEmptyValue(value: ResponseInputValue): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function addIssue(context: z.RefinementCtx, fieldId: string, message: string) {
  context.addIssue({ code: "custom", path: [fieldId], message });
}

function parseStringArray(value: ResponseInputValue) {
  if (Array.isArray(value)) return stringArraySchema.safeParse(value);
  if (typeof value !== "string") return stringArraySchema.safeParse(value);
  try {
    return stringArraySchema.safeParse(JSON.parse(value));
  } catch {
    return stringArraySchema.safeParse(value);
  }
}

function optionValueSet(field: FormVersionFieldSnapshot): Set<string> {
  return new Set((field.options ?? []).map((option) => option.value));
}

function validateRequired(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  if (field.isRequired === true && isEmptyValue(value)) return "Required";
  return undefined;
}

function validateText(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  const requiredError = validateRequired(field, value);
  if (requiredError) return requiredError;
  if (isEmptyValue(value)) return undefined;
  if (typeof value !== "string") return "Invalid text value";
  const validation = field.validation;
  if (validation?.minLength !== undefined && value.length < validation.minLength) return "Text is too short";
  if (validation?.maxLength !== undefined && value.length > validation.maxLength) return "Text is too long";
  return undefined;
}

function validateEmail(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  const textError = validateText(field, value);
  if (textError) return textError;
  if (isEmptyValue(value)) return undefined;
  return z.email().safeParse(value).success ? undefined : "Invalid email address";
}

function validateNumber(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  const requiredError = validateRequired(field, value);
  if (requiredError) return requiredError;
  if (isEmptyValue(value)) return undefined;
  const parsed = z.coerce.number().safeParse(value);
  if (!parsed.success || !Number.isFinite(parsed.data)) return "Invalid number value";
  const validation = field.validation;
  if (validation?.min !== undefined && parsed.data < validation.min) return "Number is too small";
  if (validation?.max !== undefined && parsed.data > validation.max) return "Number is too large";
  return undefined;
}

function validateSingleSelect(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  const requiredError = validateRequired(field, value);
  if (requiredError) return requiredError;
  if (isEmptyValue(value)) return undefined;
  if (typeof value !== "string") return "Invalid option value";
  return optionValueSet(field).has(value) ? undefined : "Invalid option value";
}

function validateStringArrayOptions(
  field: FormVersionFieldSnapshot,
  value: ResponseInputValue,
  invalidMessage: string,
) {
  const requiredError = validateRequired(field, value);
  if (requiredError) return requiredError;
  if (isEmptyValue(value)) return undefined;
  const parsed = parseStringArray(value);
  if (!parsed.success) return invalidMessage;
  const options = optionValueSet(field);
  return parsed.data.every((selectedValue) => options.has(selectedValue)) ? undefined : invalidMessage;
}

function validateCheckbox(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  if ((field.options?.length ?? 0) > 0) return validateStringArrayOptions(field, value, "Invalid checkbox value");
  if (field.isRequired === true && value !== true && value !== "true") return "Required";
  if (isEmptyValue(value)) return undefined;
  if (value === true || value === false || value === "true" || value === "false") return undefined;
  return "Invalid checkbox value";
}

function validateRating(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  const requiredError = validateRequired(field, value);
  if (requiredError) return requiredError;
  if (isEmptyValue(value)) return undefined;
  const parsed = z.coerce.number().int().safeParse(value);
  const ratingMax = field.validation?.ratingMax ?? 5;
  if (!parsed.success || parsed.data < 1 || parsed.data > ratingMax) return "Invalid rating value";
  return undefined;
}

function validateDate(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  const requiredError = validateRequired(field, value);
  if (requiredError) return requiredError;
  if (isEmptyValue(value)) return undefined;
  if (typeof value !== "string") return "Invalid date value";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date value";
  const validation = field.validation;
  if (validation?.dateMin && value < validation.dateMin) return "Date is too early";
  if (validation?.dateMax && value > validation.dateMax) return "Date is too late";
  return undefined;
}

export function buildFieldSchema(field: FormVersionFieldSnapshot): ZodType<ResponseInputValue> {
  return responseInputValueSchema.optional().superRefine((value, context) => {
    const message = getFieldValidationMessage(field, value);
    if (message) context.addIssue({ code: "custom", message });
  });
}

export function buildResponseSchema(fields: FormVersionFieldSnapshot[]) {
  return responseObjectSchema.superRefine((value, context) => {
    const fieldById = new Map(fields.map((field) => [field.id, field]));
    for (const fieldId of Object.keys(value)) {
      if (!fieldById.has(fieldId)) addIssue(context, fieldId, "Unknown form field submitted");
    }
    for (const field of fields) {
      const submittedValue = value[field.id];
      const fieldResult = buildFieldSchema(field).safeParse(submittedValue);
      if (!fieldResult.success) addIssue(context, field.id, fieldResult.error.issues[0]?.message ?? "Invalid value");
    }
  });
}

export function getFieldValidationMessage(field: FormVersionFieldSnapshot, value: ResponseInputValue) {
  if (field.type === "SHORT_TEXT" || field.type === "LONG_TEXT") return validateText(field, value);
  if (field.type === "EMAIL") return validateEmail(field, value);
  if (field.type === "NUMBER") return validateNumber(field, value);
  if (field.type === "SINGLE_SELECT") return validateSingleSelect(field, value);
  if (field.type === "MULTI_SELECT") return validateStringArrayOptions(field, value, "Invalid option value");
  if (field.type === "CHECKBOX") return validateCheckbox(field, value);
  if (field.type === "RATING") return validateRating(field, value);
  if (field.type === "DATE") return validateDate(field, value);
  return validateRequired(field, value);
}

export function formatValidationErrors(
  error: ZodError,
  fields: FormVersionFieldSnapshot[],
): FieldValidationError[] {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  return error.issues.map((issue) => {
    const fieldId = issue.path[0];
    const stableFieldId = typeof fieldId === "string" ? fieldId : "";
    return {
      fieldId: stableFieldId,
      fieldKey: fieldById.get(stableFieldId)?.labelKey ?? stableFieldId,
      message: issue.message,
    };
  });
}

export function normalizeAnswerValue(
  field: FormVersionFieldSnapshot,
  value: ResponseInputValue,
): NormalizedAnswerValue | null {
  if (isEmptyValue(value)) return null;
  if (field.type === "MULTI_SELECT" || (field.type === "CHECKBOX" && (field.options?.length ?? 0) > 0)) {
    const parsed = parseStringArray(value);
    if (!parsed.success || parsed.data.length === 0) return null;
    return {
      rawValue: parsed.data,
      normalizedText: null,
      normalizedNumber: null,
      normalizedDate: null,
      optionValues: parsed.data,
    };
  }
  if (field.type === "CHECKBOX") {
    const checked = value === true || value === "true";
    return {
      rawValue: checked,
      normalizedText: String(checked),
      normalizedNumber: null,
      normalizedDate: null,
      optionValues: null,
    };
  }
  if (field.type === "NUMBER" || field.type === "RATING") {
    const parsed = z.coerce.number().safeParse(value);
    if (!parsed.success || !Number.isFinite(parsed.data)) return null;
    return {
      rawValue: parsed.data,
      normalizedText: null,
      normalizedNumber: String(parsed.data),
      normalizedDate: null,
      optionValues: null,
    };
  }
  if (field.type === "DATE" && typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return {
      rawValue: value,
      normalizedText: value,
      normalizedNumber: null,
      normalizedDate: date,
      optionValues: null,
    };
  }
  if (typeof value !== "string") return null;
  return {
    rawValue: value,
    normalizedText: value,
    normalizedNumber: null,
    normalizedDate: null,
    optionValues: null,
  };
}
