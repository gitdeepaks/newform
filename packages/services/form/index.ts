import { db, eq } from "@repo/database";
import { formFieldsTable, formsTable } from "@repo/database/schema";
import {
  createFormInputSchema,
  getFormByIdInputSchema,
  listFromByUserIdInputSchema,
  type CreateFormInputSchemaType,
  type GetFormByIdInputSchemaType,
  type ListFromByUserIdInputSchemaType,
} from "./model";

class FormService {
  public async createForm(input: CreateFormInputSchemaType) {
    const { title, description, createdBy } = await createFormInputSchema.parseAsync(input);

    const formInsertResult = await db
      .insert(formsTable)
      .values({
        title,
        description,
        createdBy,
      })
      .returning({
        id: formsTable.id,
      });

    if (!formInsertResult || formInsertResult.length === 0 || !formInsertResult[0]?.id) {
      throw new Error("Failed to create form");
    }

    return {
      id: formInsertResult[0].id,
    };
  }

  public async listFromByUserId(input: ListFromByUserIdInputSchemaType) {
    const { userId } = await listFromByUserIdInputSchema.parseAsync(input);

    return db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        description: formsTable.description,
        createdAt: formsTable.createdAt,
        updatedAt: formsTable.updatedAt,
      })
      .from(formsTable)
      .where(eq(formsTable.createdBy, userId));
  }

  public async getFormById(input: GetFormByIdInputSchemaType) {
    const { formId } = await getFormByIdInputSchema.parseAsync(input);

    const rows = await db
      .select({
        form: {
          id: formsTable.id,
          title: formsTable.title,
          description: formsTable.description,
        },
        field: {
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
        },
      })
      .from(formsTable)
      .leftJoin(formFieldsTable, eq(formFieldsTable.formId, formsTable.id))
      .where(eq(formsTable.id, formId))
      .orderBy(formFieldsTable.index);

    const [firstRow] = rows;
    if (!firstRow) {
      throw new Error(`Form With ${formId} Not Found`);
    }

    const { form } = firstRow;
    const fields = rows
      .map((row) => row.field)
      .filter((field): field is NonNullable<typeof field> => field !== null);

    return {
      ...form,
      fields,
    };
  }
}

export default FormService;
