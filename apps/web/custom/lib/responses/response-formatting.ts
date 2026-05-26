import { z } from "zod";

type ResponseFieldOption = {
  value: string;
  label: string;
};

type ResponseField = {
  type: string;
  options?: ResponseFieldOption[] | null;
  validation?: {
    ratingMax?: number;
  } | null;
};

const stringArraySchema = z.array(z.string());

export function parseStringArray(value: string): string[] {
  try {
    return stringArraySchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}

export function getOptionLabel(field: ResponseField, value: string): string {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

export function formatValue(field: ResponseField, value: string | undefined): string {
  if (value === undefined || value === "") return "-";
  if (field.type === "SINGLE_SELECT") return getOptionLabel(field, value);
  if (field.type === "MULTI_SELECT") {
    const values = parseStringArray(value).map((item) => getOptionLabel(field, item));
    return values.length > 0 ? values.join(", ") : "-";
  }
  if (field.type === "CHECKBOX") {
    if ((field.options?.length ?? 0) > 0) {
      const values = parseStringArray(value).map((item) => getOptionLabel(field, item));
      return values.length > 0 ? values.join(", ") : "-";
    }
    return value === "true" ? "Yes" : "No";
  }
  if (field.type === "RATING") return `${value} / ${field.validation?.ratingMax ?? 5}`;
  return value;
}
