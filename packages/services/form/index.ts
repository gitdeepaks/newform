import { db, eq } from "@repo/database";
import { formsTable } from "@repo/database/schema";
import {
  createFormInputSchema,
  listFromByUserIdInputSchema,
  type CreateFormInputSchemaType,
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
}

export default FormService;
