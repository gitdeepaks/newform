"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useForm, useSubmitForm } from "@/hooks/api/form";
import { use, useState, type FormEvent } from "react";
import { toast } from "sonner";

type PublicFormPageProps = {
  params: Promise<{
    form_id: string;
  }>;
};

type Field = NonNullable<ReturnType<typeof useForm>["form"]>["fields"][number];

const inputTypeMap: Record<Field["type"], string> = {
  TEXT: "text",
  NUMBER: "number",
  EMAIL: "email",
  PASSWORD: "password",
  YES_NO: "checkbox",
};

export default function PublicFormPage({ params }: PublicFormPageProps) {
  const { form_id } = use(params);
  const { form, formError, formIsLoading } = useForm(form_id);
  const { submitFormAsync, submitFormIsPending } = useSubmitForm();

  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  function setAnswer(fieldId: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    const missing = form.fields.filter((field) => {
      if (!field.isRequired) return false;
      const value = answers[field.id];
      if (field.type === "YES_NO") return value !== true;
      return value === undefined || `${value}`.trim() === "";
    });

    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.map((field) => field.label).join(", ")}`);
      return;
    }

    try {
      await submitFormAsync({
        formId: form.id,
        values: form.fields
          .filter((field) => answers[field.id] !== undefined)
          .map((field) => ({
            formFieldId: field.id,
            value: `${answers[field.id]}`,
          })),
      });
      toast.success("Form submitted");
      setIsSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit form";
      toast.error(message);
    }
  }

  return (
    <main className="flex min-h-svh justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-xl">
        {formIsLoading ? (
          <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading form...
          </div>
        ) : formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError.message}</AlertDescription>
          </Alert>
        ) : isSubmitted ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Thanks for your response</CardTitle>
              <CardDescription>Your submission has been recorded.</CardDescription>
            </CardHeader>
          </Card>
        ) : form ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{form.title}</CardTitle>
              {form.description ? <CardDescription>{form.description}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              {form.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">This form has no fields yet.</p>
              ) : (
                <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
                  {form.fields.map((field) =>
                    field.type === "YES_NO" ? (
                      <div
                        key={field.id}
                        className="flex flex-row items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <Label htmlFor={field.id}>
                            {field.label}
                            {field.isRequired ? <span className="text-destructive"> *</span> : null}
                          </Label>
                          {field.description ? (
                            <p className="text-sm text-muted-foreground">{field.description}</p>
                          ) : null}
                        </div>
                        <Switch
                          id={field.id}
                          checked={answers[field.id] === true}
                          disabled={submitFormIsPending}
                          onCheckedChange={(checked) => setAnswer(field.id, checked)}
                        />
                      </div>
                    ) : (
                      <div key={field.id} className="flex flex-col gap-2">
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.isRequired ? <span className="text-destructive"> *</span> : null}
                        </Label>
                        {field.description ? (
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                        ) : null}
                        <Input
                          id={field.id}
                          type={inputTypeMap[field.type]}
                          placeholder={field.placeholder ?? undefined}
                          required={field.isRequired ?? false}
                          disabled={submitFormIsPending}
                          value={(answers[field.id] as string) ?? ""}
                          onChange={(event) => setAnswer(field.id, event.target.value)}
                        />
                      </div>
                    ),
                  )}

                  <Button type="submit" className="w-full" disabled={submitFormIsPending}>
                    {submitFormIsPending ? <Spinner /> : null}
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
