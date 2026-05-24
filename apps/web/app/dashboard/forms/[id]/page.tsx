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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateField,
  useDeleteField,
  useFields,
  useOwnerForm,
  usePublishForm,
  useUnpublishForm,
  useUpdateField,
  useUpdateForm,
  useUpdateSlug,
  useUpdateVisibility,
} from "@/hooks/api/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon, ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const fieldTypes = ["TEXT", "NUMBER", "EMAIL", "YES_NO", "PASSWORD"] as const;

const fieldSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  description: z.string().trim().optional(),
  placeholder: z.string().trim().optional(),
  isRequired: z.boolean(),
  type: z.enum(fieldTypes),
});

type FieldValues = z.infer<typeof fieldSchema>;

const settingsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(55),
  description: z.string().trim().max(300).optional(),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  visibility: z.enum(["public", "unlisted"]),
  thankYouTitle: z.string().trim().min(1).max(120),
  thankYouMessage: z.string().trim().min(1).max(300),
});

type SettingsValues = z.infer<typeof settingsSchema>;

type FormBuilderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const defaultFieldValues: FieldValues = {
  label: "",
  description: "",
  placeholder: "",
  isRequired: false,
  type: "TEXT",
};

const formatFieldType = (type: string) => type.replace("_", "/");

export default function FormBuilderPage({ params }: FormBuilderPageProps) {
  const { id } = use(params);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { form: ownerForm, formError: ownerFormError, formIsLoading: ownerFormIsLoading } =
    useOwnerForm(id);
  const { fields, fieldsError, fieldsIsLoading } = useFields(id);
  const { createFieldAsync, createFieldError, createFieldIsPending } = useCreateField();
  const { updateFieldAsync, updateFieldError, updateFieldIsPending } = useUpdateField();
  const { deleteFieldAsync, deleteFieldIsPending } = useDeleteField();
  const { updateFormAsync, updateFormIsPending } = useUpdateForm();
  const { updateSlugAsync, updateSlugIsPending } = useUpdateSlug();
  const { updateVisibilityAsync, updateVisibilityIsPending } = useUpdateVisibility();
  const { publishFormAsync, publishFormIsPending } = usePublishForm();
  const { unpublishFormAsync, unpublishFormIsPending } = useUnpublishForm();

  const createForm = useForm<FieldValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: defaultFieldValues,
  });

  const editForm = useForm<FieldValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: defaultFieldValues,
  });

  const settingsForm = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      title: "",
      description: "",
      slug: "",
      visibility: "unlisted",
      thankYouTitle: "Thanks for your response",
      thankYouMessage: "Your submission has been recorded.",
    },
  });

  useEffect(() => {
    if (!ownerForm) return;
    settingsForm.reset({
      title: ownerForm.title,
      description: ownerForm.description ?? "",
      slug: ownerForm.slug,
      visibility: ownerForm.visibility === "public" ? "public" : "unlisted",
      thankYouTitle: ownerForm.thankYouTitle ?? "Thanks for your response",
      thankYouMessage: ownerForm.thankYouMessage ?? "Your submission has been recorded.",
    });
  }, [ownerForm, settingsForm]);

  const createIsSubmitting = createForm.formState.isSubmitting || createFieldIsPending;
  const updateIsSubmitting = editForm.formState.isSubmitting || updateFieldIsPending;
  const createApiError = formError ?? createFieldError?.message ?? null;
  const updateApiError = formError ?? updateFieldError?.message ?? null;

  async function onCreateField(values: FieldValues) {
    setFormError(null);

    try {
      await createFieldAsync({
        ...values,
        formId: id,
        description: values.description || undefined,
        placeholder: values.placeholder || undefined,
        index: `${((fields?.length ?? 0) + 1).toFixed(2)}`,
      });
      toast.success("Field created successfully");
      createForm.reset(defaultFieldValues);
      setCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create field";
      setFormError(message);
      toast.error(message);
    }
  }

  function openEditField(field: NonNullable<typeof fields>[number]) {
    setFormError(null);
    setEditingFieldId(field.id);
    editForm.reset({
      label: field.label,
      description: field.description ?? "",
      placeholder: field.placeholder ?? "",
      isRequired: field.isRequired ?? false,
      type: field.type,
    });
    setEditOpen(true);
  }

  async function onUpdateField(values: FieldValues) {
    if (!editingFieldId) return;
    setFormError(null);

    try {
      await updateFieldAsync({
        id: editingFieldId,
        ...values,
        description: values.description || null,
        placeholder: values.placeholder || null,
      });
      toast.success("Field updated successfully");
      setEditOpen(false);
      setEditingFieldId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update field";
      setFormError(message);
      toast.error(message);
    }
  }

  async function onDeleteField(fieldId: string) {
    try {
      await deleteFieldAsync({ id: fieldId });
      toast.success("Field deleted successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete field";
      toast.error(message);
    }
  }

  async function onSaveSettings(values: SettingsValues) {
    try {
      await updateFormAsync({
        formId: id,
        title: values.title,
        description: values.description || null,
        thankYouTitle: values.thankYouTitle,
        thankYouMessage: values.thankYouMessage,
      });
      if (values.slug !== ownerForm?.slug) {
        await updateSlugAsync({ formId: id, slug: values.slug });
      }
      if (values.visibility !== ownerForm?.visibility) {
        await updateVisibilityAsync({ formId: id, visibility: values.visibility });
      }
      toast.success("Form settings saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(message);
    }
  }

  async function onPublish() {
    try {
      await publishFormAsync({ formId: id });
      toast.success("Form published");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish form";
      toast.error(message);
    }
  }

  async function onUnpublish() {
    try {
      await unpublishFormAsync({ formId: id });
      toast.success("Form unpublished");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unpublish form";
      toast.error(message);
    }
  }

  async function copyShareLink() {
    if (!ownerForm?.slug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/f/${ownerForm.slug}`);
    toast.success("Share link copied");
  }

  const lifecycleIsPending =
    updateFormIsPending ||
    updateSlugIsPending ||
    updateVisibilityIsPending ||
    publishFormIsPending ||
    unpublishFormIsPending;

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
              <h1 className="text-2xl font-semibold">Form builder</h1>
              <p className="text-sm text-muted-foreground">Add and manage fields for this form.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
              <PlusIcon />
              Add field
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Form settings</CardTitle>
                  <CardDescription>Manage publishing, visibility, and the public share URL.</CardDescription>
                </div>
                {ownerForm ? (
                  <div className="flex gap-2">
                    <Badge variant={ownerForm.status === "published" ? "default" : "secondary"}>
                      {ownerForm.status}
                    </Badge>
                    <Badge variant="outline">{ownerForm.visibility}</Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {ownerFormIsLoading ? (
                <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Loading settings...
                </div>
              ) : ownerFormError ? (
                <Alert variant="destructive">
                  <AlertDescription>{ownerFormError.message}</AlertDescription>
                </Alert>
              ) : ownerForm ? (
                <Form {...settingsForm}>
                  <form
                    onSubmit={settingsForm.handleSubmit(onSaveSettings)}
                    className="grid gap-4 lg:grid-cols-2"
                  >
                    <FormField
                      control={settingsForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={lifecycleIsPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={lifecycleIsPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visibility</FormLabel>
                          <FormControl>
                            <NativeSelect
                              value={field.value}
                              disabled={lifecycleIsPending}
                              onChange={(event) => field.onChange(event.target.value)}
                            >
                              <NativeSelectOption value="public">Public</NativeSelectOption>
                              <NativeSelectOption value="unlisted">Unlisted</NativeSelectOption>
                            </NativeSelect>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={lifecycleIsPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="thankYouTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thank-you title</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={lifecycleIsPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="thankYouMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thank-you message</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={lifecycleIsPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-2 lg:col-span-2 sm:flex-row sm:justify-between">
                      <div className="flex gap-2">
                        <Button type="submit" disabled={lifecycleIsPending}>
                          {lifecycleIsPending ? <Spinner /> : null}
                          Save settings
                        </Button>
                        {ownerForm.status === "published" ? (
                          <Button type="button" variant="outline" disabled={lifecycleIsPending} onClick={onUnpublish}>
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={lifecycleIsPending || fieldsIsLoading || !fields || fields.length === 0}
                            onClick={onPublish}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {ownerForm.status === "published" ? (
                          <Button type="button" variant="secondary" onClick={copyShareLink}>
                            <CopyIcon />
                            Copy link
                          </Button>
                        ) : null}
                        <Button asChild type="button" variant="ghost">
                          <Link href={`/f/${ownerForm.slug}`} target="_blank">
                            <ExternalLinkIcon />
                            Open public page
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
              <CardDescription>Fields are shown in their current fractional index order.</CardDescription>
            </CardHeader>
            <CardContent>
              {fieldsIsLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Loading fields...
                </div>
              ) : fieldsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{fieldsError.message}</AlertDescription>
                </Alert>
              ) : fields && fields.length > 0 ? (
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
                    {fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div className="font-medium">{field.label}</div>
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
                            <Button variant="ghost" size="icon" onClick={() => openEditField(field)}>
                              <PencilIcon />
                              <span className="sr-only">Edit field</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deleteFieldIsPending}
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
                    <p className="font-medium">No fields yet</p>
                    <p className="text-sm text-muted-foreground">Add your first field to start building this form.</p>
                  </div>
                  <Button onClick={() => setCreateOpen(true)}>
                    <PlusIcon />
                    Add field
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <FieldDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add field"
        description="Create a new field at the end of this form."
        form={createForm}
        apiError={createApiError}
        isSubmitting={createIsSubmitting}
        submitLabel="Create field"
        onSubmit={onCreateField}
      />

      <FieldDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit field"
        description="Update the field label, metadata, and type. The label key will not change."
        form={editForm}
        apiError={updateApiError}
        isSubmitting={updateIsSubmitting}
        submitLabel="Save changes"
        onSubmit={onUpdateField}
      />
    </SidebarProvider>
  );
}

function FieldDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  apiError,
  isSubmitting,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  form: ReturnType<typeof useForm<FieldValues>>;
  apiError: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (values: FieldValues) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} placeholder="Email address" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <NativeSelect {...field} disabled={isSubmitting} className="w-full">
                      {fieldTypes.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {formatFieldType(type)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="placeholder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placeholder</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} placeholder="name@example.com" />
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
                      placeholder="Help users understand what to enter"
                      className="min-h-20 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Required</FormLabel>
                    <p className="text-sm text-muted-foreground">Users must complete this field.</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      disabled={isSubmitting}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : null}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
