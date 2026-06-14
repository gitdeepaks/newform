import type { FormVersionFieldSnapshot } from "@repo/database/schema";
import type { ResponseInputValue } from "./response-schema";

export type ConditionalPublicField = FormVersionFieldSnapshot;

export function isFieldVisibleForSubmission(
  field: ConditionalPublicField,
  answerByFieldId: Map<string, ResponseInputValue>,
): boolean {
  const condition = field.visibilityCondition;
  if (!condition) return true;

  const sourceValue = answerByFieldId.get(condition.sourceFieldId);
  if (sourceValue === undefined) return false;

  const comparableValue = Array.isArray(sourceValue) ? sourceValue.join(",") : String(sourceValue);
  if (condition.operator === "equals") return comparableValue === condition.value;
  return comparableValue !== condition.value;
}
