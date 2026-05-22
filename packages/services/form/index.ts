import { db } from "@repo/database";
import { formsTable } from "@repo/database/schema";
import { createFormInputSchema, type CreateFormInputSchemaType } from "./model";

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
}

export default FormService;
