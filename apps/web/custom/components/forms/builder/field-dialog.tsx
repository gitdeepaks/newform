"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  canBeConditionSource,
  fieldTypes,
  formatFieldType,
  optionFieldTypes,
  type BuilderField,
  type FieldValues,
} from "@/custom/components/forms/builder/form-builder-shared";
import { useForm } from "react-hook-form";

type FieldDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  form: ReturnType<typeof useForm<FieldValues>>;
  apiError: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (values: FieldValues) => Promise<void>;
  pageIndexes: number[];
  fields: BuilderField[];
  editingFieldId: string | null;
};

export function FieldDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  apiError,
  isSubmitting,
  submitLabel,
  onSubmit,
  pageIndexes,
  fields,
  editingFieldId,
}: FieldDialogProps) {
  const selectedType = form.watch("type");
  const hasVisibilityCondition = form.watch("hasVisibilityCondition");
  const conditionSourceFieldId = form.watch("conditionSourceFieldId");
  const usesOptions = optionFieldTypes.has(selectedType);
  const usesTextValidation = selectedType === "SHORT_TEXT" || selectedType === "LONG_TEXT";
  const usesNumberValidation = selectedType === "NUMBER";
  const usesRatingValidation = selectedType === "RATING";
  const usesDateValidation = selectedType === "DATE";
  const conditionSourceFields = fields.filter(
    (field) => field.id !== editingFieldId && canBeConditionSource(field),
  );
  const conditionSourceField = conditionSourceFields.find(
    (field) => field.id === conditionSourceFieldId,
  );
  const conditionValues =
    conditionSourceField?.type === "SINGLE_SELECT"
      ? (conditionSourceField.options ?? [])
      : conditionSourceField?.type === "CHECKBOX"
        ? [
            { id: "true", label: "True", value: "true" },
            { id: "false", label: "False", value: "false" },
          ]
        : conditionSourceField?.type === "RATING"
          ? Array.from({ length: conditionSourceField.validation?.ratingMax ?? 5 }, (_, index) => ({
              id: `${index + 1}`,
              label: `${index + 1}`,
              value: `${index + 1}`,
            }))
          : [];

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
              name="pageIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page</FormLabel>
                  <FormControl>
                    <NativeSelect {...field} disabled={isSubmitting} className="w-full">
                      {pageIndexes.map((pageIndex) => (
                        <NativeSelectOption key={pageIndex} value={pageIndex.toString()}>
                          Page {pageIndex + 1}
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
                      <Input
                        {...field}
                        disabled={isSubmitting}
                        type="number"
                        min="2"
                        max="10"
                        placeholder="5"
                      />
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
                    <Switch checked={field.value} disabled={isSubmitting} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="rounded-lg border p-3">
              <FormField
                control={form.control}
                name="hasVisibilityCondition"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div>
                      <FormLabel>Conditional visibility</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Show this field only when another answer matches.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} disabled={isSubmitting} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {hasVisibilityCondition ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="conditionSourceFieldId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source field</FormLabel>
                        <FormControl>
                          <NativeSelect
                            {...field}
                            disabled={isSubmitting}
                            className="w-full"
                            onChange={(event) => {
                              field.onChange(event);
                              form.setValue("conditionValue", "");
                            }}
                          >
                            <NativeSelectOption value="">Select field</NativeSelectOption>
                            {conditionSourceFields.map((sourceField) => (
                              <NativeSelectOption key={sourceField.id} value={sourceField.id}>
                                {sourceField.label}
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
                    name="conditionOperator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operator</FormLabel>
                        <FormControl>
                          <NativeSelect {...field} disabled={isSubmitting} className="w-full">
                            <NativeSelectOption value="equals">Equals</NativeSelectOption>
                            <NativeSelectOption value="not_equals">Does not equal</NativeSelectOption>
                          </NativeSelect>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conditionValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <NativeSelect
                            {...field}
                            disabled={isSubmitting || !conditionSourceField}
                            className="w-full"
                          >
                            <NativeSelectOption value="">Select value</NativeSelectOption>
                            {conditionValues.map((value) => (
                              <NativeSelectOption key={value.id} value={value.value}>
                                {value.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
            </div>

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
