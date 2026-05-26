import type { FormFieldVisibilityCondition } from "@repo/database/schema";
import type { PublicField } from "./answer-validation";

export type ConditionalPublicField = PublicField & {
  visibilityCondition: FormFieldVisibilityCondition | null;
};

export function isFieldVisibleForSubmission(
  field: ConditionalPublicField,
  answerByFieldId: Map<string, string>,
): boolean {
  const condition = field.visibilityCondition;
  if (!condition) return true;

  const sourceValue = answerByFieldId.get(condition.sourceFieldId);
  if (sourceValue === undefined) return false;

  if (condition.operator === "equals") return sourceValue === condition.value;
  return sourceValue !== condition.value;
}
