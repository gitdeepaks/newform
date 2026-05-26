export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatMetadata(metadata: Record<string, string | number | boolean | null> | null | undefined) {
  if (!metadata) return "-";
  return Object.entries(metadata).map(([key, value]) => `${key}: ${value ?? "null"}`).join(", ");
}
