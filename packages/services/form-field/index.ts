import { db, eq } from "@repo/database";
import { formFieldsTable } from "@repo/database/schema";
import {
  createFieldInputSchema,
  deleteFieldInputSchema,
  getFieldsInputSchema,
  type CreateFieldInputSchemaType,
  type DeleteFieldInputSchemaType,
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

class FormFieldService {
  public async createField(input: CreateFieldInputSchemaType) {
    const { label, description, placeholder, isRequired, index, type, formId } =
      await createFieldInputSchema.parseAsync(input);

    const fieldInsertResult = await db
      .insert(formFieldsTable)
      .values({
        label,
        labelKey: createLabelKey(label),
        description,
        placeholder,
        isRequired,
        index,
        type,
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
    const { formId } = await getFieldsInputSchema.parseAsync(input);

    return db
      .select({
        id: formFieldsTable.id,
        label: formFieldsTable.label,
        description: formFieldsTable.description,
        labelKey: formFieldsTable.labelKey,
        placeholder: formFieldsTable.placeholder,
        isRequired: formFieldsTable.isRequired,
        index: formFieldsTable.index,
        type: formFieldsTable.type,
        formId: formFieldsTable.formId,
        createdAt: formFieldsTable.createdAt,
        updatedAt: formFieldsTable.updatedAt,
      })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.index);
  }

  public async updateField(input: UpdateFieldInputSchemaType) {
    const { id, ...updates } = await updateFieldInputSchema.parseAsync(input);

    const fieldUpdateResult = await db
      .update(formFieldsTable)
      .set(updates)
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
    const { id } = await deleteFieldInputSchema.parseAsync(input);

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
