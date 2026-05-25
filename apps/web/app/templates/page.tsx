"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePublicForms } from "@/hooks/api/form";
import Link from "next/link";

export default function TemplatesPage() {
  const { forms, formsError, formsIsLoading } = usePublicForms();

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Start from polished public forms built with NewForm.
          </p>
        </div>

        {formsIsLoading ? (
          <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading templates...
          </div>
        ) : formsError ? (
          <Alert variant="destructive">
            <AlertDescription>{formsError.message}</AlertDescription>
          </Alert>
        ) : forms && forms.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id} className="overflow-hidden">
                <div
                  className="h-2"
                  style={{ backgroundColor: form.theme?.tokens.accent ?? "hsl(var(--primary))" }}
                />
                <CardHeader>
                  <CardTitle>{form.title}</CardTitle>
                  <CardDescription>{form.description ?? "A public NewForm template."}</CardDescription>
                </CardHeader>
                <CardContent>
                  {form.theme ? (
                    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span className="text-muted-foreground">{form.theme.name}</span>
                      <div className="flex gap-1">
                        {[form.theme.tokens.background, form.theme.tokens.card, form.theme.tokens.accent].map(
                          (color) => (
                            <span
                              key={color}
                              className="h-5 w-5 rounded-full border"
                              style={{ backgroundColor: color }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Default NewForm styling</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/f/${form.slug}`}>Open form</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No templates yet</CardTitle>
              <CardDescription>Published public forms will appear here.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
