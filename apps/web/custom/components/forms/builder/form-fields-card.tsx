"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { formatFieldType, type BuilderField } from "@/custom/components/forms/builder/form-builder-shared";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

type FormFieldsCardProps = {
  pageIndexes: number[];
  selectedPageIndex: number;
  selectedFields: BuilderField[];
  isLoading: boolean;
  errorMessage?: string;
  deleteIsPending: boolean;
  onSelectPage: (pageIndex: number) => void;
  onCreateField: () => void;
  onEditField: (field: BuilderField) => void;
  onDeleteField: (fieldId: string) => void;
};

export function FormFieldsCard({
  pageIndexes,
  selectedPageIndex,
  selectedFields,
  isLoading,
  errorMessage,
  deleteIsPending,
  onSelectPage,
  onCreateField,
  onEditField,
  onDeleteField,
}: FormFieldsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fields</CardTitle>
        <CardDescription>Fields are grouped by page and shown in page order.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {pageIndexes.map((pageIndex) => (
            <Button
              key={pageIndex}
              type="button"
              variant={selectedPageIndex === pageIndex ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPage(pageIndex)}
            >
              Page {pageIndex + 1}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectPage(Math.max(...pageIndexes) + 1)}
          >
            <PlusIcon /> Add page
          </Button>
        </div>
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading fields...
          </div>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : selectedFields.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Key</TableHead>
                <TableHead className="hidden sm:table-cell">Required</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <div className="font-medium">{field.label}</div>
                    {field.visibilityCondition ? <Badge variant="secondary">Conditional</Badge> : null}
                    <div className="text-sm text-muted-foreground">
                      {field.description || field.placeholder || "No description"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatFieldType(field.type)}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {field.labelKey}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {field.isRequired ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEditField(field)}>
                        <PencilIcon />
                        <span className="sr-only">Edit field</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteIsPending}
                        onClick={() => onDeleteField(field.id)}
                      >
                        <Trash2Icon />
                        <span className="sr-only">Delete field</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
            <div>
              <p className="font-medium">No fields on Page {selectedPageIndex + 1} yet</p>
              <p className="text-sm text-muted-foreground">Add a field to this page.</p>
            </div>
            <Button onClick={onCreateField}>
              <PlusIcon />
              Add field
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
