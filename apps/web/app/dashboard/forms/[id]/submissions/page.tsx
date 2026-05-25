"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthGate } from "@/components/auth/auth-gate";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { useExportResponsesCsv, useResponses } from "@/hooks/api/form";
import { use, useState } from "react";
import { toast } from "sonner";

type SubmissionsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Field = NonNullable<ReturnType<typeof useResponses>["responsesData"]>["fields"][number];

const stringArraySchema = {
  parse(value: string) {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  },
};

function parseStringArray(value: string) {
  try {
    return stringArraySchema.parse(value);
  } catch {
    return [];
  }
}

function getOptionLabel(field: Field, value: string) {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

function formatValue(field: Field, value: string | undefined) {
  if (value === undefined || value === "") return "-";
  if (field.type === "SINGLE_SELECT") return getOptionLabel(field, value);
  if (field.type === "MULTI_SELECT") {
    const values = parseStringArray(value).map((item) => getOptionLabel(field, item));
    return values.length > 0 ? values.join(", ") : "-";
  }
  if (field.type === "CHECKBOX") {
    if ((field.options?.length ?? 0) > 0) {
      const values = parseStringArray(value).map((item) => getOptionLabel(field, item));
      return values.length > 0 ? values.join(", ") : "-";
    }
    return value === "true" ? "Yes" : "No";
  }
  if (field.type === "RATING") return `${value} / ${field.validation?.ratingMax ?? 5}`;
  return value;
}

export default function SubmissionsPage({ params }: SubmissionsPageProps) {
  const { id } = use(params);
  const [page, setPage] = useState(1);

  const { responsesData, responsesError, responsesIsLoading, responsesIsFetching } = useResponses(id, page);
  const { exportResponsesCsvAsync, exportResponsesCsvIsPending } = useExportResponsesCsv();

  const fields = responsesData?.fields;
  const responses = responsesData?.responses;
  const pagination = responsesData?.pagination;

  const onExportCsv = async () => {
    try {
      const { csv, filename } = await exportResponsesCsvAsync({ formId: id });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export CSV");
    }
  };

  return (
    <AuthGate mode="auth">
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
            <h1 className="text-2xl font-semibold">Responses</h1>
            <p className="text-sm text-muted-foreground">
              Responses people have submitted to this form.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Responses</CardTitle>
                  <CardDescription>
                    {pagination ? `${pagination.total} total` : "Each row is a single response."}
                  </CardDescription>
                </div>
                <Button onClick={onExportCsv} disabled={exportResponsesCsvIsPending}>
                  {exportResponsesCsvIsPending ? <Spinner /> : null}
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {responsesIsLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Loading responses...
                </div>
              ) : responsesError ? (
                <Alert variant="destructive">
                  <AlertDescription>{responsesError.message}</AlertDescription>
                </Alert>
              ) : fields && fields.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
                  <p className="font-medium">No fields yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add fields to this form before collecting responses.
                  </p>
                </div>
              ) : responses && responses.length > 0 && fields && pagination ? (
                <div className="flex flex-col gap-4">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submitted At</TableHead>
                        <TableHead>Respondent Email</TableHead>
                        {fields.map((field) => (
                          <TableHead key={field.id}>{field.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response) => {
                        const valueByFieldId = new Map(
                          (response.values ?? []).map((entry) => [entry.formFieldId, entry.value]),
                        );

                        return (
                          <TableRow key={response.id}>
                            <TableCell className="text-muted-foreground">
                              {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell>{response.respondentEmail ?? "-"}</TableCell>
                            {fields.map((field) => (
                              <TableCell key={field.id}>
                                {formatValue(field, valueByFieldId.get(field.id))}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || responsesIsFetching}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    >
                      Previous
                    </Button>
                    <span>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages || responsesIsFetching}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
                  <p className="font-medium">No responses yet</p>
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
    </AuthGate>
  );
}
