"use client";

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
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
  useFormAnalytics,
  useAssignTheme,
  useOwnerForm,
  usePublishForm,
  useThemes,
  useUnpublishForm,
  useUpdateField,
  useUpdateForm,
  useUpdateSlug,
  useUpdateVisibility,
} from "@/hooks/api/form";
import { DashboardShell } from "@/custom/components/dashboard/dashboard-shell";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon, ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const fieldTypes = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "NUMBER",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RATING",
  "DATE",
] as const;

const fieldSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  description: z.string().trim().optional(),
  placeholder: z.string().trim().optional(),
  isRequired: z.boolean(),
  type: z.enum(fieldTypes),
  optionsText: z.string().optional(),
  minLength: z.string().optional(),
  maxLength: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  ratingMax: z.string().optional(),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
});

type FieldValues = z.infer<typeof fieldSchema>;
type FieldType = FieldValues["type"];
type FieldOption = {
  id: string;
  label: string;
  value: string;
};
type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  ratingMax?: number;
  dateMin?: string;
  dateMax?: string;
};

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
type OwnerForm = NonNullable<ReturnType<typeof useOwnerForm>["form"]>;
type BuilderField = NonNullable<ReturnType<typeof useFields>["fields"]>[number];
type ThemeTokens = NonNullable<OwnerForm["theme"]>["tokens"];

type FormBuilderPageProps = {
  formId: string;
};

const defaultFieldValues: FieldValues = {
  label: "",
  description: "",
  placeholder: "",
  isRequired: false,
  type: "SHORT_TEXT",
  optionsText: "",
  minLength: "",
  maxLength: "",
  min: "",
  max: "",
  ratingMax: "5",
  dateMin: "",
  dateMax: "",
};

const optionFieldTypes = new Set<FieldType>(["SINGLE_SELECT", "MULTI_SELECT", "CHECKBOX"]);

const formatFieldType = (type: string) =>
  type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const slugifyOption = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseOptions = (type: FieldType, optionsText?: string): FieldOption[] | null => {
  if (!optionFieldTypes.has(type)) return null;

  const uniqueOptions = new Map<string, FieldOption>();
  for (const line of (optionsText ?? "").split("\n")) {
    const label = line.trim();
    const value = slugifyOption(label);
    if (!label || !value || uniqueOptions.has(value)) continue;
    uniqueOptions.set(value, { id: value, label, value });
  }

  return Array.from(uniqueOptions.values());
};

const optionalNumber = (value?: string) => {
  if (!value || value.trim() === "") return undefined;
  return Number(value);
};

const buildValidation = (values: FieldValues): FieldValidation | null => {
  const validation: FieldValidation = {};

  if (values.type === "SHORT_TEXT" || values.type === "LONG_TEXT") {
    validation.minLength = optionalNumber(values.minLength);
    validation.maxLength = optionalNumber(values.maxLength);
  }

  if (values.type === "NUMBER") {
    validation.min = optionalNumber(values.min);
    validation.max = optionalNumber(values.max);
  }

  if (values.type === "RATING") {
    validation.ratingMax = optionalNumber(values.ratingMax);
  }

  if (values.type === "DATE") {
    validation.dateMin = values.dateMin || undefined;
    validation.dateMax = values.dateMax || undefined;
  }

  const hasValues = Object.values(validation).some((value) => value !== undefined && value !== "");
  return hasValues ? validation : null;
};

const optionsToText = (options: FieldOption[] | null) =>
  options?.map((option) => option.label).join("\n") ?? "";

const validationToFieldValues = (validation: FieldValidation | null) => ({
  minLength: validation?.minLength?.toString() ?? "",
  maxLength: validation?.maxLength?.toString() ?? "",
  min: validation?.min?.toString() ?? "",
  max: validation?.max?.toString() ?? "",
  ratingMax: validation?.ratingMax?.toString() ?? "5",
  dateMin: validation?.dateMin ?? "",
  dateMax: validation?.dateMax ?? "",
});

export function FormBuilderPage({ formId: id }: FormBuilderPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { form: ownerForm, formError: ownerFormError, formIsLoading: ownerFormIsLoading } =
    useOwnerForm(id);
  const { fields, fieldsError, fieldsIsLoading } = useFields(id);
  const { analytics, analyticsError, analyticsIsLoading } = useFormAnalytics(id);
  const { createFieldAsync, createFieldError, createFieldIsPending } = useCreateField();
  const { updateFieldAsync, updateFieldError, updateFieldIsPending } = useUpdateField();
  const { deleteFieldAsync, deleteFieldIsPending } = useDeleteField();
  const { updateFormAsync, updateFormIsPending } = useUpdateForm();
  const { updateSlugAsync, updateSlugIsPending } = useUpdateSlug();
  const { updateVisibilityAsync, updateVisibilityIsPending } = useUpdateVisibility();
  const { publishFormAsync, publishFormIsPending } = usePublishForm();
  const { unpublishFormAsync, unpublishFormIsPending } = useUnpublishForm();
  const { themes, themesIsLoading } = useThemes();
  const { assignThemeAsync, assignThemeIsPending } = useAssignTheme();

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
        formId: id,
        label: values.label,
        description: values.description || undefined,
        placeholder: values.placeholder || undefined,
        isRequired: values.isRequired,
        type: values.type,
        options: parseOptions(values.type, values.optionsText),
        validation: buildValidation(values),
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
      optionsText: optionsToText(field.options),
      ...validationToFieldValues(field.validation),
    });
    setEditOpen(true);
  }

  async function onUpdateField(values: FieldValues) {
    if (!editingFieldId) return;
    setFormError(null);

    try {
      await updateFieldAsync({
        id: editingFieldId,
        label: values.label,
        isRequired: values.isRequired,
        type: values.type,
        description: values.description || null,
        placeholder: values.placeholder || null,
        options: parseOptions(values.type, values.optionsText),
        validation: buildValidation(values),
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

  async function onAssignTheme(themeId: string) {
    try {
      await assignThemeAsync({ formId: id, themeId });
      toast.success("Theme saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save theme";
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
    unpublishFormIsPending ||
    assignThemeIsPending;

  return (
    <DashboardShell>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total responses</CardDescription>
                <CardTitle className="text-3xl">{analytics?.totalResponses ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Submissions</CardDescription>
                <CardTitle className="text-3xl">{analytics?.totalSubmissions ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Views</CardDescription>
                <CardTitle className="text-3xl">{analytics?.totalViews ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completion rate</CardDescription>
                <CardTitle className="text-3xl">
                  {Math.round(analytics?.completionRate ?? 0)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {analyticsError ? (
            <Alert variant="destructive">
              <AlertDescription>{analyticsError.message}</AlertDescription>
            </Alert>
          ) : null}

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
                    <div className="rounded-lg border p-4 lg:col-span-2">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-medium">Theme</h3>
                        <p className="text-sm text-muted-foreground">
                          Current: {ownerForm.theme?.name ?? "No theme selected"}
                        </p>
                      </div>
                      {themesIsLoading ? (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Spinner />
                          Loading themes...
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {(themes ?? []).map((theme) => {
                            const selected = ownerForm.theme?.id === theme.id;
                            return (
                              <button
                                key={theme.id}
                                type="button"
                                disabled={assignThemeIsPending}
                                onClick={() => onAssignTheme(theme.id)}
                                className={`rounded-lg border p-3 text-left transition hover:border-primary disabled:opacity-60 ${
                                  selected ? "border-primary ring-2 ring-primary/20" : ""
                                }`}
                              >
                                <div className="font-medium">{theme.name}</div>
                                <div className="text-xs text-muted-foreground">{theme.category}</div>
                                <div className="mt-3 flex gap-1">
                                  {[theme.tokens.background, theme.tokens.card, theme.tokens.accent].map((color) => (
                                    <span
                                      key={color}
                                      className="h-5 w-5 rounded-full border"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 lg:col-span-2 sm:flex-row sm:justify-between">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <Button type="submit" disabled={lifecycleIsPending}>
                          {lifecycleIsPending ? <Spinner /> : null}
                          Save settings
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={ownerFormIsLoading || fieldsIsLoading || !fields}
                          onClick={() => setPreviewOpen(true)}
                        >
                          Preview
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
                        <p className="text-xs text-muted-foreground sm:hidden">
                          Preview uses the latest saved fields and settings.
                        </p>
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

          <Card>
            <CardHeader>
              <CardTitle>Field breakdown</CardTitle>
              <CardDescription>Quick response counts by field.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsIsLoading ? (
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
        </div>
      

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

      {ownerForm && fields ? (
        <FormPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={ownerForm}
          fields={fields}
        />
      ) : null}
    </DashboardShell>
  );
}

function FormPreviewDialog({
  open,
  onOpenChange,
  form,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: OwnerForm;
  fields: BuilderField[];
}) {
  const theme: ThemeTokens | undefined = form.theme?.tokens;
  const previewShellStyle = theme ? { backgroundColor: theme.background, color: theme.text } : undefined;
  const previewCardStyle = theme
    ? { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }
    : undefined;
  const mutedStyle = theme ? { color: theme.mutedText } : undefined;
  const accentStyle = theme ? { backgroundColor: theme.accent, color: theme.accentText } : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview form</DialogTitle>
          <DialogDescription>This is how respondents will see your saved form.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto rounded-lg bg-muted/30 p-3 sm:p-6" style={previewShellStyle}>
          <Card className="mx-auto max-w-xl" style={previewCardStyle}>
            <CardHeader>
              <CardTitle className="text-2xl">{form.title}</CardTitle>
              {form.description ? <CardDescription style={mutedStyle}>{form.description}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground" style={mutedStyle}>
                  No fields yet. Add fields to preview the respondent experience.
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {fields.map((field) => (
                    <PreviewField key={field.id} field={field} mutedStyle={mutedStyle} />
                  ))}

                  <div className="space-y-2">
                    <Button type="button" className="w-full" disabled style={accentStyle}>
                      Submit response
                    </Button>
                    <p className="text-center text-xs text-muted-foreground" style={mutedStyle}>
                      Preview mode only. No response will be submitted.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewField({
  field,
  mutedStyle,
}: {
  field: BuilderField;
  mutedStyle?: CSSProperties;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`preview-${field.id}`}>
        {field.label}
        {field.isRequired ? <span className="text-destructive">*</span> : null}
      </Label>
      {field.description ? (
        <p className="text-sm text-muted-foreground" style={mutedStyle}>
          {field.description}
        </p>
      ) : null}
      <PreviewFieldControl field={field} mutedStyle={mutedStyle} />
    </div>
  );
}

function PreviewFieldControl({
  field,
  mutedStyle,
}: {
  field: BuilderField;
  mutedStyle?: CSSProperties;
}) {
  const fieldId = `preview-${field.id}`;

  if (field.type === "LONG_TEXT") {
    return <Textarea id={fieldId} disabled readOnly placeholder={field.placeholder ?? "Long answer"} />;
  }

  if (field.type === "SINGLE_SELECT") {
    return (
      <NativeSelect id={fieldId} disabled className="w-full" value="">
        <NativeSelectOption value="">Select an option</NativeSelectOption>
        {field.options?.length ? (
          field.options.map((option) => (
            <NativeSelectOption key={option.id} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))
        ) : (
          <NativeSelectOption value="__empty" disabled>
            No options configured
          </NativeSelectOption>
        )}
      </NativeSelect>
    );
  }

  if (field.type === "MULTI_SELECT" || (field.type === "CHECKBOX" && field.options?.length)) {
    return <PreviewOptionList options={field.options ?? []} mutedStyle={mutedStyle} />;
  }

  if (field.type === "CHECKBOX") {
    return (
      <div className="flex flex-row items-center justify-between rounded-lg border p-3">
        <span className="text-sm text-muted-foreground" style={mutedStyle}>
          Confirm
        </span>
        <Switch id={fieldId} checked={false} disabled />
      </div>
    );
  }

  if (field.type === "RATING") {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: field.validation?.ratingMax ?? 5 }, (_, index) => {
          const value = `${index + 1}`;
          return (
            <Button key={value} type="button" variant="outline" size="sm" disabled>
              {value}
            </Button>
          );
        })}
      </div>
    );
  }

  if (field.type === "EMAIL") {
    return <Input id={fieldId} type="email" disabled readOnly placeholder={field.placeholder ?? "name@example.com"} />;
  }

  if (field.type === "NUMBER") {
    return <Input id={fieldId} type="number" disabled readOnly placeholder={field.placeholder ?? "0"} />;
  }

  if (field.type === "DATE") {
    return <Input id={fieldId} type="date" disabled readOnly />;
  }

  return <Input id={fieldId} type="text" disabled readOnly placeholder={field.placeholder ?? "Short answer"} />;
}

function PreviewOptionList({
  options,
  mutedStyle,
}: {
  options: FieldOption[];
  mutedStyle?: CSSProperties;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-lg border p-3 text-sm text-muted-foreground" style={mutedStyle}>
        No options configured
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled readOnly />
          {option.label}
        </label>
      ))}
    </div>
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
  const selectedType = form.watch("type");
  const usesOptions = optionFieldTypes.has(selectedType);
  const usesTextValidation = selectedType === "SHORT_TEXT" || selectedType === "LONG_TEXT";
  const usesNumberValidation = selectedType === "NUMBER";
  const usesRatingValidation = selectedType === "RATING";
  const usesDateValidation = selectedType === "DATE";

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

            {usesOptions ? (
              <FormField
                control={form.control}
                name="optionsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isSubmitting}
                        placeholder={"One option per line\nAnime\nGaming\nStartups"}
                        className="min-h-28 resize-none"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Add at least two options.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {usesTextValidation ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="minLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min length</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} inputMode="numeric" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max length</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} inputMode="numeric" placeholder="120" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {usesNumberValidation ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min value</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} type="number" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max value</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} type="number" placeholder="100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {usesRatingValidation ? (
              <FormField
                control={form.control}
                name="ratingMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating scale</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} type="number" min="2" max="10" placeholder="5" />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Allowed range is 2 to 10.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {usesDateValidation ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min date</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max date</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

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
