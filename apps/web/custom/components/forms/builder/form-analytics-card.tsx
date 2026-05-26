"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatFieldType } from "@/custom/components/forms/builder/form-builder-shared";
import { useFormAnalytics } from "@/hooks/api/form";

type FormAnalyticsCardProps = {
  analytics: ReturnType<typeof useFormAnalytics>["analytics"];
  isLoading: boolean;
};

export function FormAnalyticsCard({ analytics, isLoading }: FormAnalyticsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Field breakdown</CardTitle>
        <CardDescription>Quick response counts by field.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading analytics...
          </div>
        ) : analytics?.fieldBreakdown.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {analytics.fieldBreakdown.map((field) => (
              <div key={field.fieldId} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{field.label}</p>
                    <p className="text-sm text-muted-foreground">{formatFieldType(field.type)}</p>
                  </div>
                  <Badge variant="secondary">{field.responseCount} filled</Badge>
                </div>
                {field.options?.length ? (
                  <div className="mt-3 space-y-2 text-sm">
                    {field.options.map((option) => (
                      <div key={option.value} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{option.label}</span>
                        <span className="font-medium">{option.count}</span>
                      </div>
                    ))}
                  </div>
                ) : field.averageRating !== undefined ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Average rating: {field.averageRating.toFixed(1)}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {field.responseCount} responses include an answer.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
            <p className="font-medium">No response data yet</p>
            <p className="text-sm text-muted-foreground">Analytics will update as responses arrive.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
