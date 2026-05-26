"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DashboardShell } from "@/custom/components/dashboard/dashboard-shell";
import { formatValue } from "@/custom/lib/responses/response-formatting";
import { useState } from "react";
import { toast } from "sonner";

type SubmissionsPageProps = {
  formId: string;
};

export function ResponsesPage({ formId: id }: SubmissionsPageProps) {
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
    <DashboardShell>
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
    </DashboardShell>
  );
}
