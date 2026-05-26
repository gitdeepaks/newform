"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getFieldsForPage,
  getPageIndexes,
  type BuilderField,
  type FieldOption,
  type OwnerForm,
  type ThemeTokens,
} from "@/custom/components/forms/builder/form-builder-shared";
import type { CSSProperties } from "react";

type FormPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: OwnerForm;
  fields: BuilderField[];
};

export function FormPreviewDialog({ open, onOpenChange, form, fields }: FormPreviewDialogProps) {
  const theme: ThemeTokens | undefined = form.theme?.tokens;
  const previewShellStyle = theme
    ? { backgroundColor: theme.background, color: theme.text }
    : undefined;
  const previewCardStyle = theme
    ? { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }
    : undefined;
  const mutedStyle = theme ? { color: theme.mutedText } : undefined;
  const accentStyle = theme
    ? { backgroundColor: theme.accent, color: theme.accentText }
    : undefined;
  const previewPages = getPageIndexes(fields).map((pageIndex) => ({
    pageIndex,
    fields: getFieldsForPage(fields, pageIndex),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview form</DialogTitle>
          <DialogDescription>This is how respondents will see your saved form.</DialogDescription>
        </DialogHeader>

        <div
          className="max-h-[70vh] overflow-y-auto rounded-lg bg-muted/30 p-3 sm:p-6"
          style={previewShellStyle}
        >
          <Card className="mx-auto max-w-xl" style={previewCardStyle}>
            <CardHeader>
              <CardTitle className="text-2xl">{form.title}</CardTitle>
              {form.description ? (
                <CardDescription style={mutedStyle}>{form.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground" style={mutedStyle}>
                  No fields yet. Add fields to preview the respondent experience.
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {previewPages.map((page) => (
                    <div key={page.pageIndex} className="flex flex-col gap-4 rounded-lg border p-4">
                      <p className="font-medium">Page {page.pageIndex + 1}</p>
                      {page.fields.map((field) => (
                        <PreviewField key={field.id} field={field} mutedStyle={mutedStyle} />
                      ))}
                    </div>
                  ))}

                  <div className="space-y-2">
                    <Button type="button" className="w-full" disabled style={accentStyle}>
                      Submit response
                    </Button>
                    <p className="text-center text-xs text-muted-foreground" style={mutedStyle}>
                      Preview mode only. No response will be submitted.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewField({ field, mutedStyle }: { field: BuilderField; mutedStyle?: CSSProperties }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`preview-${field.id}`}>
        {field.label}
        {field.isRequired ? <span className="text-destructive">*</span> : null}
        {field.visibilityCondition ? (
          <Badge variant="secondary" className="ml-2">
            Conditional
          </Badge>
        ) : null}
      </Label>
      {field.description ? (
        <p className="text-sm text-muted-foreground" style={mutedStyle}>
          {field.description}
        </p>
      ) : null}
      <PreviewFieldControl field={field} mutedStyle={mutedStyle} />
    </div>
  );
}

function PreviewFieldControl({
  field,
  mutedStyle,
}: {
  field: BuilderField;
  mutedStyle?: CSSProperties;
}) {
  const fieldId = `preview-${field.id}`;

  if (field.type === "LONG_TEXT") {
    return <Textarea id={fieldId} disabled readOnly placeholder={field.placeholder ?? "Long answer"} />;
  }

  if (field.type === "SINGLE_SELECT") {
    return (
      <NativeSelect id={fieldId} disabled className="w-full" value="">
        <NativeSelectOption value="">Select an option</NativeSelectOption>
        {field.options?.length ? (
          field.options.map((option) => (
            <NativeSelectOption key={option.id} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))
        ) : (
          <NativeSelectOption value="__empty" disabled>
            No options configured
          </NativeSelectOption>
        )}
      </NativeSelect>
    );
  }

  if (field.type === "MULTI_SELECT" || (field.type === "CHECKBOX" && field.options?.length)) {
    return <PreviewOptionList options={field.options ?? []} mutedStyle={mutedStyle} />;
  }

  if (field.type === "CHECKBOX") {
    return (
      <div className="flex flex-row items-center justify-between rounded-lg border p-3">
        <span className="text-sm text-muted-foreground" style={mutedStyle}>
          Confirm
        </span>
        <Switch id={fieldId} checked={false} disabled />
      </div>
    );
  }

  if (field.type === "RATING") {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: field.validation?.ratingMax ?? 5 }, (_, index) => {
          const value = `${index + 1}`;
          return (
            <Button key={value} type="button" variant="outline" size="sm" disabled>
              {value}
            </Button>
          );
        })}
      </div>
    );
  }

  if (field.type === "EMAIL") {
    return (
      <Input
        id={fieldId}
        type="email"
        disabled
        readOnly
        placeholder={field.placeholder ?? "name@example.com"}
      />
    );
  }

  if (field.type === "NUMBER") {
    return <Input id={fieldId} type="number" disabled readOnly placeholder={field.placeholder ?? "0"} />;
  }

  if (field.type === "DATE") return <Input id={fieldId} type="date" disabled readOnly />;

  return (
    <Input
      id={fieldId}
      type="text"
      disabled
      readOnly
      placeholder={field.placeholder ?? "Short answer"}
    />
  );
}

function PreviewOptionList({
  options,
  mutedStyle,
}: {
  options: FieldOption[];
  mutedStyle?: CSSProperties;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-lg border p-3 text-sm text-muted-foreground" style={mutedStyle}>
        No options configured
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled readOnly />
          {option.label}
        </label>
      ))}
    </div>
  );
}
