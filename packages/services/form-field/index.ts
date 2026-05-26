import { and, db, eq } from "@repo/database";
import { formFieldsTable, formsTable } from "@repo/database/schema";
import {
  createFieldInputSchema,
  deleteFieldInputSchema,
  formFieldTypeSchema,
  getFieldsInputSchema,
  type CreateFieldInputSchemaType,
  type DeleteFieldInputSchemaType,
  type FormFieldOptionSchemaType,
  type FormFieldTypeSchemaType,
  type FormFieldValidationSchemaType,
  type FormFieldVisibilityConditionSchemaType,
  type GetFieldsInputSchemaType,
  type UpdateFieldInputSchemaType,
  updateFieldInputSchema,
} from "./model";

const createLabelKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const optionFieldTypes = new Set<FormFieldTypeSchemaType>([
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
]);

const conditionSourceFieldTypes = new Set<FormFieldTypeSchemaType>([
  "SINGLE_SELECT",
  "CHECKBOX",
  "RATING",
]);

const normalizeOptions = (
  type: FormFieldTypeSchemaType,
  options: FormFieldOptionSchemaType[] | null | undefined,
) => {
  if (!optionFieldTypes.has(type)) return null;
  return options ?? [];
};

const normalizeValidation = (validation: FormFieldValidationSchemaType | null | undefined) => {
  if (!validation || Object.keys(validation).length === 0) return null;
  return validation;
};

const validateFieldConfig = (
  type: FormFieldTypeSchemaType,
  options: FormFieldOptionSchemaType[] | null,
  validation: FormFieldValidationSchemaType | null,
) => {
  if (optionFieldTypes.has(type)) {
    if (!options || options.length < 2) {
      throw new Error("Option fields need at least two options");
    }

    const uniqueValues = new Set(options.map((option) => option.value));
    if (uniqueValues.size !== options.length) {
      throw new Error("Option values must be unique");
    }
  }

  if (validation?.minLength !== undefined && validation.maxLength !== undefined) {
    if (validation.minLength > validation.maxLength) {
      throw new Error("Minimum length cannot be greater than maximum length");
    }
  }

  if (validation?.min !== undefined && validation.max !== undefined) {
    if (validation.min > validation.max) {
      throw new Error("Minimum value cannot be greater than maximum value");
    }
  }

  if (validation?.dateMin && validation.dateMax && validation.dateMin > validation.dateMax) {
    throw new Error("Minimum date cannot be after maximum date");
  }
};

async function validateVisibilityCondition(
  formId: string,
  fieldId: string | null,
  condition: FormFieldVisibilityConditionSchemaType | null | undefined,
) {
  if (!condition) return;
  if (fieldId === condition.sourceFieldId) throw new Error("A field cannot depend on itself");

  const sourceRows = await db
    .select({
      id: formFieldsTable.id,
      type: formFieldsTable.type,
      options: formFieldsTable.options,
      validation: formFieldsTable.validation,
    })
    .from(formFieldsTable)
    .where(and(eq(formFieldsTable.id, condition.sourceFieldId), eq(formFieldsTable.formId, formId)))
    .limit(1);

  const sourceField = sourceRows[0];
  if (!sourceField) throw new Error("Condition source field must belong to the same form");

  const sourceType = formFieldTypeSchema.parse(sourceField.type);
  if (!conditionSourceFieldTypes.has(sourceType))
    throw new Error("Unsupported condition source field type");

  if (sourceType === "SINGLE_SELECT") {
    const optionValues = new Set((sourceField.options ?? []).map((option) => option.value));
    if (!optionValues.has(condition.value))
      throw new Error("Condition value must match a source option");
  }

  if (sourceType === "CHECKBOX") {
    if ((sourceField.options?.length ?? 0) > 0) {
      throw new Error("Option checkbox fields cannot be condition sources");
    }
    if (condition.value !== "true" && condition.value !== "false") {
      throw new Error("Checkbox condition value must be true or false");
    }
  }

  if (sourceType === "RATING") {
    const rating = Number(condition.value);
    const ratingMax = sourceField.validation?.ratingMax ?? 5;
    if (!Number.isInteger(rating) || rating < 1 || rating > ratingMax) {
      throw new Error("Rating condition value is out of range");
    }
  }
}

class FormFieldService {
  private async assertFormOwner(formId: string, userId: string) {
    const rows = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.createdBy, userId)))
      .limit(1);

    if (rows.length === 0) {
      throw new Error(`Form With ${formId} Not Found`);
    }
  }

  private async getFieldFormId(fieldId: string) {
    const rows = await db
      .select({ formId: formFieldsTable.formId })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.id, fieldId))
      .limit(1);

    const formId = rows[0]?.formId;
    if (!formId) {
      throw new Error(`Field With ${fieldId} Not Found`);
    }

    return formId;
  }

  public async createField(input: CreateFieldInputSchemaType) {
    const {
      userId,
      label,
      description,
      placeholder,
      isRequired,
      index,
      pageIndex,
      type,
      formId,
      options,
      validation,
      visibilityCondition,
    } = await createFieldInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);

    const normalizedOptions = normalizeOptions(type, options);
    const normalizedValidation = normalizeValidation(validation);
    validateFieldConfig(type, normalizedOptions, normalizedValidation);
    await validateVisibilityCondition(formId, null, visibilityCondition);

    const fieldInsertResult = await db
      .insert(formFieldsTable)
      .values({
        label,
        labelKey: createLabelKey(label),
        description,
        placeholder,
        isRequired,
        index,
        pageIndex: pageIndex ?? 0,
        type,
        options: normalizedOptions,
        validation: normalizedValidation,
        visibilityCondition: visibilityCondition ?? null,
        formId,
      })
      .returning({
        id: formFieldsTable.id,
      });

    if (!fieldInsertResult || fieldInsertResult.length === 0 || !fieldInsertResult[0]?.id) {
      throw new Error("Failed to create field");
    }

    return {
      id: fieldInsertResult[0].id,
    };
  }

  public async getFields(input: GetFieldsInputSchemaType) {
    const { userId, formId } = await getFieldsInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);

    const fields = await db
      .select({
        id: formFieldsTable.id,
        label: formFieldsTable.label,
        description: formFieldsTable.description,
        labelKey: formFieldsTable.labelKey,
        placeholder: formFieldsTable.placeholder,
        isRequired: formFieldsTable.isRequired,
        index: formFieldsTable.index,
        pageIndex: formFieldsTable.pageIndex,
        type: formFieldsTable.type,
        options: formFieldsTable.options,
        validation: formFieldsTable.validation,
        visibilityCondition: formFieldsTable.visibilityCondition,
        formId: formFieldsTable.formId,
        createdAt: formFieldsTable.createdAt,
        updatedAt: formFieldsTable.updatedAt,
      })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.pageIndex, formFieldsTable.index);

    return fields.map((field) => ({ ...field, type: formFieldTypeSchema.parse(field.type) }));
  }

  public async updateField(input: UpdateFieldInputSchemaType) {
    const { userId, id, ...updates } = await updateFieldInputSchema.parseAsync(input);
    const formId = await this.getFieldFormId(id);
    await this.assertFormOwner(formId, userId);

    const fieldRows = await db
      .select({
        type: formFieldsTable.type,
        options: formFieldsTable.options,
        validation: formFieldsTable.validation,
      })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.id, id))
      .limit(1);

    const currentField = fieldRows[0];
    if (!currentField) {
      throw new Error(`Field With ${id} Not Found`);
    }

    const currentType = formFieldTypeSchema.parse(currentField.type);
    const nextType = updates.type ?? currentType;
    const normalizedOptions = normalizeOptions(nextType, updates.options ?? currentField.options);
    const normalizedValidation = normalizeValidation(updates.validation ?? currentField.validation);
    validateFieldConfig(nextType, normalizedOptions, normalizedValidation);
    await validateVisibilityCondition(formId, id, updates.visibilityCondition);

    const fieldUpdateResult = await db
      .update(formFieldsTable)
      .set({ ...updates, options: normalizedOptions, validation: normalizedValidation })
      .where(eq(formFieldsTable.id, id))
      .returning({
        id: formFieldsTable.id,
      });

    if (!fieldUpdateResult || fieldUpdateResult.length === 0 || !fieldUpdateResult[0]?.id) {
      throw new Error(`Field With ${id} Not Found`);
    }

    return {
      id: fieldUpdateResult[0].id,
    };
  }

  public async deleteField(input: DeleteFieldInputSchemaType) {
    const { userId, id } = await deleteFieldInputSchema.parseAsync(input);
    const formId = await this.getFieldFormId(id);
    await this.assertFormOwner(formId, userId);

    const fieldDeleteResult = await db
      .delete(formFieldsTable)
      .where(eq(formFieldsTable.id, id))
      .returning({
        id: formFieldsTable.id,
      });

    if (!fieldDeleteResult || fieldDeleteResult.length === 0 || !fieldDeleteResult[0]?.id) {
      throw new Error(`Field With ${id} Not Found`);
    }

    return {
      id: fieldDeleteResult[0].id,
    };
  }
}

export default FormFieldService;
