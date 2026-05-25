"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFields, useSubmissions } from "@/hooks/api/form";
import { use } from "react";

type SubmissionsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Field = NonNullable<ReturnType<typeof useFields>["fields"]>[number];

function formatValue(field: Field, value: string | undefined) {
  if (value === undefined || value === "") return "—";
  if (field.type === "CHECKBOX") return value === "true" ? "Yes" : value;
  return value;
}

export default function SubmissionsPage({ params }: SubmissionsPageProps) {
  const { id } = use(params);

  const { fields, fieldsError, fieldsIsLoading } = useFields(id);
  const { submissions, submissionsError, submissionsIsLoading } = useSubmissions(id);

  const isLoading = fieldsIsLoading || submissionsIsLoading;
  const error = fieldsError ?? submissionsError;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div>
            <h1 className="text-2xl font-semibold">Submissions</h1>
            <p className="text-sm text-muted-foreground">
              Responses people have submitted to this form.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Responses</CardTitle>
              <CardDescription>
                {submissions ? `${submissions.length} total` : "Each row is a single submission."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Loading submissions...
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : fields && fields.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
                  <p className="font-medium">No fields yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add fields to this form before collecting responses.
                  </p>
                </div>
              ) : submissions && submissions.length > 0 && fields ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {fields.map((field) => (
                          <TableHead key={field.id}>{field.label}</TableHead>
                        ))}
                        <TableHead className="text-right">Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission) => {
                        const valueByFieldId = new Map(
                          (submission.values ?? []).map((entry) => [entry.formFieldId, entry.value]),
                        );

                        return (
                          <TableRow key={submission.id}>
                            {fields.map((field) => (
                              <TableCell key={field.id}>
                                {formatValue(field, valueByFieldId.get(field.id))}
                              </TableCell>
                            ))}
                            <TableCell className="text-right text-muted-foreground">
                              {submission.createdAt
                                ? new Date(submission.createdAt).toLocaleString()
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
                  <p className="font-medium">No submissions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Responses will appear here once people start submitting this form.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
