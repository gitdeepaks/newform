"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { usePublicForm, useSubmitPublicResponse } from "@/hooks/api/form";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

type PublicSlugFormPageProps = {
  slug: string;
};

type Field = NonNullable<ReturnType<typeof usePublicForm>["form"]>["fields"][number];
type PublicAnswer = string | string[] | boolean;
type PublicAnswers = Record<string, PublicAnswer>;
type PublicFormPageGroup = { pageIndex: number; fields: Field[] };

function getPublicFormErrorMessage(message: string | undefined): string {
  if (message === "This form is closed") {
    return "This form is closed and is no longer accepting responses.";
  }

  if (message === "This form has reached its response limit") {
    return "This form has reached its response limit and is no longer accepting responses.";
  }

  return "This form is unavailable or has not been published.";
}

const inputTypeMap: Record<Field["type"], string> = {
  SHORT_TEXT: "text",
  LONG_TEXT: "text",
  NUMBER: "number",
  EMAIL: "email",
  SINGLE_SELECT: "text",
  MULTI_SELECT: "text",
  CHECKBOX: "checkbox",
  RATING: "number",
  DATE: "date",
};

const getStringAnswer = (answers: PublicAnswers, fieldId: string) => {
  const value = answers[fieldId];
  return typeof value === "string" ? value : "";
};

const getArrayAnswer = (answers: PublicAnswers, fieldId: string) => {
  const value = answers[fieldId];
  return Array.isArray(value) ? value : [];
};

const serializeAnswer = (answer: PublicAnswer) => {
  if (Array.isArray(answer)) return JSON.stringify(answer);
  return `${answer}`;
};

const isMissingRequiredAnswer = (field: Field, answer: PublicAnswer | undefined) => {
  if (!field.isRequired) return false;
  if (Array.isArray(answer)) return answer.length === 0;
  if (typeof answer === "boolean") return answer !== true;
  return answer === undefined || answer.trim() === "";
};

function groupFieldsByPage(fields: Field[]): PublicFormPageGroup[] {
  const groups = new Map<number, Field[]>();
  for (const field of fields) {
    const pageIndex = field.pageIndex ?? 0;
    groups.set(pageIndex, [...(groups.get(pageIndex) ?? []), field]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageIndex, fields]) => ({ pageIndex, fields }));
}

function isFieldVisible(field: Field, answers: PublicAnswers): boolean {
  const condition = field.visibilityCondition;
  if (!condition) return true;
  const answer = answers[condition.sourceFieldId];
  if (answer === undefined) return false;
  const answerValue = Array.isArray(answer) ? answer.join(",") : `${answer}`;
  return condition.operator === "equals"
    ? answerValue === condition.value
    : answerValue !== condition.value;
}

function getVisiblePages(
  pages: PublicFormPageGroup[],
  answers: PublicAnswers,
): PublicFormPageGroup[] {
  return pages
    .map((page) => ({
      ...page,
      fields: page.fields.filter((field) => isFieldVisible(field, answers)),
    }))
    .filter((page) => page.fields.length > 0);
}

function removeHiddenAnswers(fields: Field[], answers: PublicAnswers): PublicAnswers {
  const nextAnswers: PublicAnswers = {};
  for (const field of fields) {
    if (!isFieldVisible(field, answers)) continue;
    const answer = answers[field.id];
    if (answer !== undefined) nextAnswers[field.id] = answer;
  }
  return nextAnswers;
}

function getMissingRequiredFields(fields: Field[], answers: PublicAnswers): Field[] {
  return fields.filter((field) => isMissingRequiredAnswer(field, answers[field.id]));
}

export function PublicFormPage({ slug }: PublicSlugFormPageProps) {
  const { form, formError, formIsLoading } = usePublicForm(slug);
  const { submitPublicResponseAsync, submitPublicResponseIsPending } = useSubmitPublicResponse();

  const [answers, setAnswers] = useState<PublicAnswers>({});
  const [currentPagePosition, setCurrentPagePosition] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const theme = form?.theme?.tokens;
  const cardStyle = theme
    ? { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }
    : undefined;
  const mutedStyle = theme ? { color: theme.mutedText } : undefined;
  const accentStyle = theme
    ? { backgroundColor: theme.accent, color: theme.accentText }
    : undefined;
  const pages = form ? groupFieldsByPage(form.fields) : [];
  const visiblePages = getVisiblePages(pages, answers);
  const currentPage =
    visiblePages[Math.min(currentPagePosition, Math.max(visiblePages.length - 1, 0))];
  const isFirstPage = currentPagePosition <= 0;
  const isLastPage = currentPagePosition >= visiblePages.length - 1;

  useEffect(() => {
    setCurrentPagePosition((position) => Math.min(position, Math.max(visiblePages.length - 1, 0)));
  }, [visiblePages.length]);

  function setAnswer(fieldId: string, value: PublicAnswer) {
    setAnswers((prev) => {
      const next = { ...prev, [fieldId]: value };
      return form ? removeHiddenAnswers(form.fields, next) : next;
    });
  }

  function toggleArrayAnswer(fieldId: string, value: string, checked: boolean) {
    setAnswers((prev) => {
      const current = getArrayAnswer(prev, fieldId);
      const next = checked ? [...current, value] : current.filter((item) => item !== value);
      const nextAnswers = { ...prev, [fieldId]: next };
      return form ? removeHiddenAnswers(form.fields, nextAnswers) : nextAnswers;
    });
  }

  function goNext() {
    if (!currentPage) return;
    const missing = getMissingRequiredFields(currentPage.fields, answers);
    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.map((field) => field.label).join(", ")}`);
      return;
    }
    setCurrentPagePosition((position) => Math.min(position + 1, visiblePages.length - 1));
  }

  function goBack() {
    setCurrentPagePosition((position) => Math.max(0, position - 1));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    const visibleFields = visiblePages.flatMap((page) => page.fields);
    const missing = getMissingRequiredFields(visibleFields, answers);

    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.map((field) => field.label).join(", ")}`);
      return;
    }

    try {
      await submitPublicResponseAsync({
        slug,
        honeypot,
        values: visibleFields.flatMap((field) => {
          const answer = answers[field.id];
          if (answer === undefined) return [];
          return [{ formFieldId: field.id, value: serializeAnswer(answer) }];
        }),
      });
      toast.success("Form submitted");
      setIsSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast.error(getPublicFormErrorMessage(message));
    }
  }

  return (
    <main
      className="flex min-h-svh justify-center bg-muted/30 px-4 py-10"
      style={theme ? { backgroundColor: theme.background, color: theme.text } : undefined}
    >
      <div className="w-full max-w-xl">
        {formIsLoading ? (
          <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading form...
          </div>
        ) : formError ? (
          <Alert variant="destructive">
            <AlertDescription>{getPublicFormErrorMessage(formError.message)}</AlertDescription>
          </Alert>
        ) : isSubmitted ? (
          <Card style={cardStyle}>
            <CardHeader>
              <CardTitle className="text-2xl">
                {form?.thankYouTitle ?? "Thanks for your response"}
              </CardTitle>
              <CardDescription style={mutedStyle}>
                {form?.thankYouMessage ?? "Your submission has been recorded."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : form ? (
          <Card style={cardStyle}>
            <CardHeader>
              <CardTitle className="text-2xl">{form.title}</CardTitle>
              {form.description ? (
                <CardDescription style={mutedStyle}>{form.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {form.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground" style={mutedStyle}>
                  This form has no fields yet.
                </p>
              ) : (
                <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
                  {currentPage ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground" style={mutedStyle}>
                        Step {currentPagePosition + 1} of {visiblePages.length}
                      </p>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${((currentPagePosition + 1) / visiblePages.length) * 100}%`,
                            ...(accentStyle ?? {}),
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {currentPage ? (
                    currentPage.fields.map((field) => (
                      <div key={field.id} className="flex flex-col gap-2">
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.isRequired ? <span className="text-destructive"> *</span> : null}
                        </Label>
                        {field.description ? (
                          <p className="text-sm text-muted-foreground" style={mutedStyle}>
                            {field.description}
                          </p>
                        ) : null}

                        {field.type === "LONG_TEXT" ? (
                          <Textarea
                            id={field.id}
                            placeholder={field.placeholder ?? undefined}
                            required={field.isRequired ?? false}
                            disabled={submitPublicResponseIsPending}
                            value={getStringAnswer(answers, field.id)}
                            onChange={(event) => setAnswer(field.id, event.target.value)}
                          />
                        ) : null}

                        {field.type === "SINGLE_SELECT" ? (
                          <NativeSelect
                            id={field.id}
                            value={getStringAnswer(answers, field.id)}
                            disabled={submitPublicResponseIsPending}
                            onChange={(event) => setAnswer(field.id, event.target.value)}
                          >
                            <NativeSelectOption value="">Select an option</NativeSelectOption>
                            {(field.options ?? []).map((option) => (
                              <NativeSelectOption key={option.id} value={option.value}>
                                {option.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        ) : null}

                        {field.type === "MULTI_SELECT" ||
                        (field.type === "CHECKBOX" && field.options?.length) ? (
                          <div className="flex flex-col gap-2 rounded-lg border p-3">
                            {(field.options ?? []).map((option) => (
                              <label key={option.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  disabled={submitPublicResponseIsPending}
                                  checked={getArrayAnswer(answers, field.id).includes(option.value)}
                                  onChange={(event) =>
                                    toggleArrayAnswer(field.id, option.value, event.target.checked)
                                  }
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        ) : null}

                        {field.type === "CHECKBOX" && !field.options?.length ? (
                          <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <span className="text-sm text-muted-foreground" style={mutedStyle}>
                              Confirm
                            </span>
                            <Switch
                              id={field.id}
                              checked={answers[field.id] === true}
                              disabled={submitPublicResponseIsPending}
                              onCheckedChange={(checked) => setAnswer(field.id, checked)}
                            />
                          </div>
                        ) : null}

                        {field.type === "RATING" ? (
                          <div className="flex flex-wrap gap-2">
                            {Array.from(
                              { length: field.validation?.ratingMax ?? 5 },
                              (_, index) => {
                                const value = `${index + 1}`;
                                const selected = getStringAnswer(answers, field.id) === value;
                                return (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant={selected ? "default" : "outline"}
                                    size="sm"
                                    disabled={submitPublicResponseIsPending}
                                    onClick={() => setAnswer(field.id, value)}
                                  >
                                    {value}
                                  </Button>
                                );
                              },
                            )}
                          </div>
                        ) : null}

                        {![
                          "LONG_TEXT",
                          "SINGLE_SELECT",
                          "MULTI_SELECT",
                          "CHECKBOX",
                          "RATING",
                        ].includes(field.type) ? (
                          <Input
                            id={field.id}
                            type={inputTypeMap[field.type]}
                            placeholder={field.placeholder ?? undefined}
                            required={field.isRequired ?? false}
                            disabled={submitPublicResponseIsPending}
                            min={
                              field.type === "DATE"
                                ? field.validation?.dateMin
                                : field.type === "NUMBER"
                                  ? field.validation?.min
                                  : undefined
                            }
                            max={
                              field.type === "DATE"
                                ? field.validation?.dateMax
                                : field.type === "NUMBER"
                                  ? field.validation?.max
                                  : undefined
                            }
                            minLength={field.validation?.minLength}
                            maxLength={field.validation?.maxLength}
                            value={getStringAnswer(answers, field.id)}
                            onChange={(event) => setAnswer(field.id, event.target.value)}
                          />
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground" style={mutedStyle}>
                      No questions are available based on your answers.
                    </p>
                  )}

                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />

                  <div className="flex gap-3">
                    {!isFirstPage ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={submitPublicResponseIsPending}
                        onClick={goBack}
                      >
                        Back
                      </Button>
                    ) : null}
                    {isLastPage ? (
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={submitPublicResponseIsPending || !currentPage}
                        style={accentStyle}
                      >
                        {submitPublicResponseIsPending ? <Spinner /> : null}
                        Submit
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={submitPublicResponseIsPending}
                        onClick={goNext}
                        style={accentStyle}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
