"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateForm, useForms } from "@/hooks/api/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRightIcon, CopyIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(55, "Title must be 55 characters or less"),
  description: z.string().trim().max(300, "Description must be 300 characters or less").optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

export default function FormsPage() {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { createFormAsync, createFormError, createFormIsPending } = useCreateForm();
  const { forms, formsError, formsIsLoading } = useForms();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting || createFormIsPending;
  const apiError = formError ?? createFormError?.message ?? null;

  async function onSubmit(values: CreateFormValues) {
    setFormError(null);

    try {
      await createFormAsync({
        title: values.title,
        description: values.description || undefined,
      });
      toast.success("Form created successfully");
      form.reset();
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create form";
      setFormError(message);
      toast.error(message);
    }
  }

  async function copyShareLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  }

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Forms</h1>
              <p className="text-sm text-muted-foreground">Create and manage forms for your workspace.</p>
            </div>
            <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
              <PlusIcon />
              Create form
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your forms</CardTitle>
              <CardDescription>Open a form to edit questions and builder settings.</CardDescription>
            </CardHeader>
            <CardContent>
              {formsIsLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Loading forms...
                </div>
              ) : formsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formsError.message}</AlertDescription>
                </Alert>
              ) : forms && forms.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Visibility</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="hidden sm:table-cell">Created</TableHead>
                      <TableHead className="w-44 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forms.map((userForm) => (
                      <TableRow key={userForm.id}>
                        <TableCell className="font-medium">
                          <Link href={`/dashboard/forms/${userForm.id}`} className="hover:underline">
                            {userForm.title}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={userForm.status === "published" ? "default" : "secondary"}>
                            {userForm.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">{userForm.visibility}</Badge>
                        </TableCell>
                        <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                          {userForm.description || "No description"}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {userForm.createdAt ? new Date(userForm.createdAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {userForm.status === "published" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => copyShareLink(userForm.slug)}
                              >
                                <CopyIcon />
                                <span className="sr-only">Copy share link</span>
                              </Button>
                            ) : null}
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/forms/${userForm.id}`}>
                                Builder
                                <ArrowUpRightIcon />
                              </Link>
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
                    <p className="font-medium">No forms yet</p>
                    <p className="text-sm text-muted-foreground">Create your first form to start collecting responses.</p>
                  </div>
                  <Button onClick={() => setOpen(true)}>
                    <PlusIcon />
                    Create form
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new form</DialogTitle>
            <DialogDescription>Add a title and optional description to start building.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              {apiError ? (
                <Alert variant="destructive" className="py-2.5">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isSubmitting}
                        placeholder="Customer feedback"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isSubmitting}
                        placeholder="Describe what this form is for"
                        className="min-h-24 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner /> : null}
                  Create form
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
