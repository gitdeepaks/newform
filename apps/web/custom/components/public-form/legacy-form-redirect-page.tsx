"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePublicRedirectById } from "@/hooks/api/form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type LegacyPublicFormPageProps = {
  formId: string;
};

export function LegacyFormRedirectPage({ formId }: LegacyPublicFormPageProps) {
  const router = useRouter();
  const { redirectData, redirectError, redirectIsLoading } = usePublicRedirectById(formId);

  useEffect(() => {
    if (redirectData?.slug) {
      router.replace(`/f/${redirectData.slug}`);
    }
  }, [redirectData?.slug, router]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Legacy form link</CardTitle>
          <CardDescription>This older link format is being safely redirected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {redirectIsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Checking legacy link...
            </div>
          ) : redirectError ? (
            <>
              <Alert variant="destructive">
                <AlertTitle>This legacy form link is unavailable.</AlertTitle>
                <AlertDescription>Please use the current public share link.</AlertDescription>
              </Alert>
              <Button type="button" onClick={() => router.push("/templates")}>
                Browse templates
              </Button>
            </>
          ) : redirectData?.slug ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Redirecting to the public form...
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
