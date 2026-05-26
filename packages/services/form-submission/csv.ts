import type { FormFieldOption, FormFieldValidation } from "@repo/database/schema";
import { parseStringArray } from "./answer-validation";

export type ResponseField = {
  id: string;
  label: string;
  type: string;
  options: FormFieldOption[] | null;
  validation: FormFieldValidation | null;
};

function getOptionLabel(field: ResponseField, value: string) {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

export function formatResponseValueForCsv(field: ResponseField, value: string | undefined) {
  if (!value) return "";

  if (field.type === "SINGLE_SELECT") return getOptionLabel(field, value);
  if (field.type === "MULTI_SELECT") {
    return parseStringArray(value)
      .map((item) => getOptionLabel(field, item))
      .join(", ");
  }
  if (field.type === "CHECKBOX") {
    if ((field.options?.length ?? 0) > 0) {
      return parseStringArray(value)
        .map((item) => getOptionLabel(field, item))
        .join(", ");
    }
    return value === "true" ? "Yes" : "No";
  }

  return value;
}

export function escapeCsvValue(value: string) {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function getAnalyticsOptionLabel(field: ResponseField, value: string) {
  if (field.type === "CHECKBOX" && (field.options?.length ?? 0) === 0) {
    return value === "true" ? "Yes" : "No";
  }
  return getOptionLabel(field, value);
}
