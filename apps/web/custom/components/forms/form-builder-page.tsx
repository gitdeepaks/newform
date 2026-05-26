"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Spinner } from "@/components/ui/spinner";
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
import { FieldDialog } from "@/custom/components/forms/builder/field-dialog";
import { FormAnalyticsCard } from "@/custom/components/forms/builder/form-analytics-card";
import { FormFieldsCard } from "@/custom/components/forms/builder/form-fields-card";
import { FormPreviewDialog } from "@/custom/components/forms/builder/form-preview-dialog";
import {
  buildValidation,
  buildVisibilityCondition,
  dateTimeLocalValueToDate,
  dateToDateTimeLocalValue,
  defaultFieldValues,
  fieldSchema,
  getFieldsForPage,
  getPageIndexes,
  optionsToText,
  parseOptions,
  responseLimitValueToNumber,
  settingsSchema,
  validationToFieldValues,
  type FieldValues,
  type SettingsValues,
} from "@/custom/components/forms/builder/form-builder-shared";
import { QrCodeDialog } from "@/custom/components/forms/builder/qr-code-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon, ExternalLinkIcon, PlusIcon, QrCodeIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormBuilderPageProps = {
  formId: string;
};


export function FormBuilderPage({ formId: id }: FormBuilderPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrShareUrl, setQrShareUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrIsLoading, setQrIsLoading] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  const {
    form: ownerForm,
    formError: ownerFormError,
    formIsLoading: ownerFormIsLoading,
  } = useOwnerForm(id);
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
      expiresAt: "",
      responseLimit: "",
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
      expiresAt: dateToDateTimeLocalValue(ownerForm.expiresAt),
      responseLimit: ownerForm.responseLimit?.toString() ?? "",
    });
  }, [ownerForm, settingsForm]);

  const createIsSubmitting = createForm.formState.isSubmitting || createFieldIsPending;
  const updateIsSubmitting = editForm.formState.isSubmitting || updateFieldIsPending;
  const createApiError = formError ?? createFieldError?.message ?? null;
  const updateApiError = formError ?? updateFieldError?.message ?? null;
  const pageIndexes = getPageIndexes(fields);
  const selectedFields = getFieldsForPage(fields, selectedPageIndex);

  function openCreateField() {
    createForm.reset({ ...defaultFieldValues, pageIndex: selectedPageIndex.toString() });
    setCreateOpen(true);
  }

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
        pageIndex: Number(values.pageIndex),
        visibilityCondition: buildVisibilityCondition(values),
        index: `${(getFieldsForPage(fields, Number(values.pageIndex)).length + 1).toFixed(2)}`,
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
      pageIndex: (field.pageIndex ?? 0).toString(),
      hasVisibilityCondition: field.visibilityCondition !== null,
      conditionSourceFieldId: field.visibilityCondition?.sourceFieldId ?? "",
      conditionOperator: field.visibilityCondition?.operator ?? "equals",
      conditionValue: field.visibilityCondition?.value ?? "",
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
        pageIndex: Number(values.pageIndex),
        visibilityCondition: buildVisibilityCondition(values),
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
        expiresAt: dateTimeLocalValueToDate(values.expiresAt),
        responseLimit: responseLimitValueToNumber(values.responseLimit),
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
    await navigator.clipboard.writeText(getPublicShareUrl(ownerForm.slug));
    toast.success("Share link copied");
  }

  function getPublicShareUrl(slug: string): string {
    return `${window.location.origin}/f/${slug}`;
  }

  async function openQrDialog() {
    if (!ownerForm?.slug || ownerForm.status !== "published") return;

    const shareUrl = getPublicShareUrl(ownerForm.slug);
    setQrOpen(true);
    setQrShareUrl(shareUrl);
    setQrDataUrl(null);
    setQrError(null);
    setQrIsLoading(true);

    try {
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 8,
        color: {
          dark: "#111827",
          light: "#ffffff",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate QR code";
      setQrError(message);
      toast.error(message);
    } finally {
      setQrIsLoading(false);
    }
  }

  function downloadQrCode() {
    if (!qrDataUrl || !ownerForm?.slug) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `newform-${ownerForm.slug}-qr.png`;
    link.click();
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
          <Button onClick={openCreateField} className="w-full sm:w-auto">
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
                <CardDescription>
                  Manage publishing, visibility, and the public share URL.
                </CardDescription>
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
                  <FormField
                    control={settingsForm.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry date and time</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" disabled={lifecycleIsPending} />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Leave empty to keep this form open until unpublished.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="responseLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response limit</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            disabled={lifecycleIsPending}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Leave empty for unlimited responses.
                        </p>
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
                                {[
                                  theme.tokens.background,
                                  theme.tokens.card,
                                  theme.tokens.accent,
                                ].map((color) => (
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
                        <Button
                          type="button"
                          variant="outline"
                          disabled={lifecycleIsPending}
                          onClick={onUnpublish}
                        >
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            lifecycleIsPending || fieldsIsLoading || !fields || fields.length === 0
                          }
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
                      {ownerForm.status === "published" ? (
                        <Button type="button" variant="outline" onClick={openQrDialog}>
                          <QrCodeIcon />
                          QR code
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

        <FormFieldsCard
          pageIndexes={pageIndexes}
          selectedPageIndex={selectedPageIndex}
          selectedFields={selectedFields}
          isLoading={fieldsIsLoading}
          errorMessage={fieldsError?.message}
          deleteIsPending={deleteFieldIsPending}
          onSelectPage={setSelectedPageIndex}
          onCreateField={openCreateField}
          onEditField={openEditField}
          onDeleteField={onDeleteField}
        />

        <FormAnalyticsCard analytics={analytics} isLoading={analyticsIsLoading} />
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
        pageIndexes={
          pageIndexes.includes(selectedPageIndex)
            ? pageIndexes
            : [...pageIndexes, selectedPageIndex].sort((a, b) => a - b)
        }
        fields={fields ?? []}
        editingFieldId={null}
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
        pageIndexes={pageIndexes}
        fields={fields ?? []}
        editingFieldId={editingFieldId}
      />

      {ownerForm && fields ? (
        <FormPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={ownerForm}
          fields={fields}
        />
      ) : null}

      <QrCodeDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        shareUrl={qrShareUrl}
        dataUrl={qrDataUrl}
        error={qrError}
        isLoading={qrIsLoading}
        onDownload={downloadQrCode}
        onCopy={copyShareLink}
      />
    </DashboardShell>
  );
}
