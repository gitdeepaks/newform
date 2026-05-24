import { db, eq } from "@repo/database";
import { formSubmissionsTable } from "@repo/database/schema";
import {
  createSubmissionInputSchema,
  getSubmissionsByFormIdInputSchema,
  type CreateSubmissionInputSchemaType,
  type GetSubmissionsByFormIdInputSchemaType,
} from "./model";

class FormSubmissionService {
  public async createSubmission(input: CreateSubmissionInputSchemaType) {
    const { formId, values } = await createSubmissionInputSchema.parseAsync(input);

    const submissionInsertResult = await db
      .insert(formSubmissionsTable)
      .values({
        formId,
        values,
      })
      .returning({
        id: formSubmissionsTable.id,
      });

    if (
      !submissionInsertResult ||
      submissionInsertResult.length === 0 ||
      !submissionInsertResult[0]?.id
    ) {
      throw new Error("Failed to create submission");
    }

    return {
      id: submissionInsertResult[0].id,
    };
  }

  public async getSubmissionsByFormId(input: GetSubmissionsByFormIdInputSchemaType) {
    const { formId } = await getSubmissionsByFormIdInputSchema.parseAsync(input);

    return db
      .select({
        id: formSubmissionsTable.id,
        formId: formSubmissionsTable.formId,
        values: formSubmissionsTable.values,
        createdAt: formSubmissionsTable.createdAt,
        updatedAt: formSubmissionsTable.updatedAt,
      })
      .from(formSubmissionsTable)
      .where(eq(formSubmissionsTable.formId, formId))
      .orderBy(formSubmissionsTable.createdAt);
  }
}

export default FormSubmissionService;
