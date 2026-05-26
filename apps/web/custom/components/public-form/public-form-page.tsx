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
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

type PublicSlugFormPageProps = {
  slug: string;
};

type Field = NonNullable<ReturnType<typeof usePublicForm>["form"]>["fields"][number];
type PublicAnswer = string | string[] | boolean;
type PublicAnswers = Record<string, PublicAnswer>;

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

export function PublicFormPage({ slug }: PublicSlugFormPageProps) {
  const { form, formError, formIsLoading } = usePublicForm(slug);
  const { submitPublicResponseAsync, submitPublicResponseIsPending } = useSubmitPublicResponse();

  const [answers, setAnswers] = useState<PublicAnswers>({});
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const theme = form?.theme?.tokens;
  const cardStyle = theme
    ? { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }
    : undefined;
  const mutedStyle = theme ? { color: theme.mutedText } : undefined;
  const accentStyle = theme ? { backgroundColor: theme.accent, color: theme.accentText } : undefined;

  function setAnswer(fieldId: string, value: PublicAnswer) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleArrayAnswer(fieldId: string, value: string, checked: boolean) {
    setAnswers((prev) => {
      const current = getArrayAnswer(prev, fieldId);
      const next = checked ? [...current, value] : current.filter((item) => item !== value);
      return { ...prev, [fieldId]: next };
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    const missing = form.fields.filter((field) => {
      return isMissingRequiredAnswer(field, answers[field.id]);
    });

    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.map((field) => field.label).join(", ")}`);
      return;
    }

    try {
      await submitPublicResponseAsync({
        slug,
        honeypot,
        values: form.fields.flatMap((field) => {
          const answer = answers[field.id];
          if (answer === undefined) return [];
          return [{ formFieldId: field.id, value: serializeAnswer(answer) }];
        }),
      });
      toast.success("Form submitted");
      setIsSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit form";
      toast.error(message);
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
            <AlertDescription>This form is unavailable or has not been published.</AlertDescription>
          </Alert>
        ) : isSubmitted ? (
          <Card style={cardStyle}>
            <CardHeader>
              <CardTitle className="text-2xl">{form?.thankYouTitle ?? "Thanks for your response"}</CardTitle>
              <CardDescription style={mutedStyle}>
                {form?.thankYouMessage ?? "Your submission has been recorded."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : form ? (
          <Card style={cardStyle}>
            <CardHeader>
              <CardTitle className="text-2xl">{form.title}</CardTitle>
              {form.description ? <CardDescription style={mutedStyle}>{form.description}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              {form.fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground" style={mutedStyle}>This form has no fields yet.</p>
              ) : (
                <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
                  {form.fields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.isRequired ? <span className="text-destructive"> *</span> : null}
                      </Label>
                      {field.description ? (
                        <p className="text-sm text-muted-foreground" style={mutedStyle}>{field.description}</p>
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

                      {field.type === "MULTI_SELECT" || (field.type === "CHECKBOX" && field.options?.length) ? (
                        <div className="flex flex-col gap-2 rounded-lg border p-3">
                          {(field.options ?? []).map((option) => (
                            <label key={option.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                disabled={submitPublicResponseIsPending}
                                checked={getArrayAnswer(answers, field.id).includes(option.value)}
                                onChange={(event) => toggleArrayAnswer(field.id, option.value, event.target.checked)}
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {field.type === "CHECKBOX" && !field.options?.length ? (
                        <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <span className="text-sm text-muted-foreground" style={mutedStyle}>Confirm</span>
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
                          {Array.from({ length: field.validation?.ratingMax ?? 5 }, (_, index) => {
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
                          })}
                        </div>
                      ) : null}

                      {!["LONG_TEXT", "SINGLE_SELECT", "MULTI_SELECT", "CHECKBOX", "RATING"].includes(field.type) ? (
                        <Input
                          id={field.id}
                          type={inputTypeMap[field.type]}
                          placeholder={field.placeholder ?? undefined}
                          required={field.isRequired ?? false}
                          disabled={submitPublicResponseIsPending}
                          min={field.type === "DATE" ? field.validation?.dateMin : field.type === "NUMBER" ? field.validation?.min : undefined}
                          max={field.type === "DATE" ? field.validation?.dateMax : field.type === "NUMBER" ? field.validation?.max : undefined}
                          minLength={field.validation?.minLength}
                          maxLength={field.validation?.maxLength}
                          value={getStringAnswer(answers, field.id)}
                          onChange={(event) => setAnswer(field.id, event.target.value)}
                        />
                      ) : null}
                    </div>
                  ))}

                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />

                  <Button type="submit" className="w-full" disabled={submitPublicResponseIsPending} style={accentStyle}>
                    {submitPublicResponseIsPending ? <Spinner /> : null}
                    Submit
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
