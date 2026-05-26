import { and, count, db, eq, sql } from "@repo/database";
import {
  emailEventsTable,
  formFieldsTable,
  formsTable,
  formSubmissionsTable,
  responseEventsTable,
  usersTable,
  type FormSubmissionMetadata,
  type FormSubmissionValueRow,
} from "@repo/database/schema";
import {
  parseStringArray,
  validateAnswer,
  type PublicField,
} from "./answer-validation";
import { isFieldVisibleForSubmission } from "./conditional-visibility";
import { escapeCsvValue, formatResponseValueForCsv, getAnalyticsOptionLabel } from "./csv";
import {
  createSubmissionInputSchema,
  exportResponsesCsvInputSchema,
  getFormAnalyticsInputSchema,
  getSubmissionsByFormIdInputSchema,
  listResponsesInputSchema,
  submitPublicResponseInputSchema,
  type CreateSubmissionInputSchemaType,
  type ExportResponsesCsvInputSchemaType,
  type GetFormAnalyticsInputSchemaType,
  type GetSubmissionsByFormIdInputSchemaType,
  type ListResponsesInputSchemaType,
  type SubmitPublicResponseInputSchemaType,
} from "./model";
import { checkRateLimit } from "./rate-limit";

function getAnswerValue(values: FormSubmissionValueRow | null | undefined, fieldId: string) {
  return values?.find((value) => value.formFieldId === fieldId)?.value;
}


class FormSubmissionService {
  private async verifyOwner(formId: string, userId: string) {
    const formRows = await db
      .select({ id: formsTable.id, title: formsTable.title })
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.createdBy, userId)))
      .limit(1);

    const form = formRows[0];
    if (!form) throw new Error(`Form With ${formId} Not Found`);
    return form;
  }

  private async getResponseFields(formId: string) {
    return db
      .select({
        id: formFieldsTable.id,
        label: formFieldsTable.label,
        type: formFieldsTable.type,
        options: formFieldsTable.options,
        validation: formFieldsTable.validation,
      })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.index);
  }

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

  public async submitPublicResponse(input: SubmitPublicResponseInputSchemaType) {
    const parsedInput = await submitPublicResponseInputSchema.parseAsync(input);
    const { slug, values, honeypot, metadata } = parsedInput;

    if (honeypot?.trim()) throw new Error("Submission rejected");

    checkRateLimit(`${metadata?.ip ?? "unknown"}:${slug}`);

    const formRows = await db
      .select({
        id: formsTable.id,
        status: formsTable.status,
        expiresAt: formsTable.expiresAt,
        responseLimit: formsTable.responseLimit,
        creatorEmail: usersTable.email,
      })
      .from(formsTable)
      .leftJoin(usersTable, eq(usersTable.id, formsTable.createdBy))
      .where(eq(formsTable.slug, slug))
      .limit(1);

    const form = formRows[0];
    if (!form) throw new Error("Form not found");
    if (form.status !== "published") throw new Error("This form is not accepting responses");
    if (form.expiresAt && form.expiresAt.getTime() < Date.now())
      throw new Error("This form is closed");

    const fields = await db
      .select({
        id: formFieldsTable.id,
        type: formFieldsTable.type,
        isRequired: formFieldsTable.isRequired,
        options: formFieldsTable.options,
        validation: formFieldsTable.validation,
        visibilityCondition: formFieldsTable.visibilityCondition,
      })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, form.id));

    const fieldById = new Map(fields.map((field) => [field.id, field]));
    const answerByFieldId = new Map(values.map((answer) => [answer.formFieldId, answer.value]));
    for (const answer of values) {
      if (!fieldById.has(answer.formFieldId)) throw new Error("Unknown form field submitted");
    }

    const visibleFields = fields.filter((field) =>
      isFieldVisibleForSubmission(field, answerByFieldId),
    );
    const visibleFieldIds = new Set(visibleFields.map((field) => field.id));
    const visibleValues = values.filter((answer) => visibleFieldIds.has(answer.formFieldId));

    for (const answer of visibleValues) {
      const field = fieldById.get(answer.formFieldId);
      if (!field) throw new Error("Unknown form field submitted");
      validateAnswer(field, answer.value);
    }

    for (const field of visibleFields) {
      const answer = answerByFieldId.get(field.id);
      if (field.isRequired && (!answer || answer.trim().length === 0)) {
        throw new Error("Please complete all required fields");
      }
    }

    const respondentEmail = fields.find((field) => field.type === "EMAIL")?.id;
    const responseMetadata: FormSubmissionMetadata = { ...metadata, slug };
    const creatorEmail = form.creatorEmail ?? undefined;
    const submittedRespondentEmail = respondentEmail
      ? answerByFieldId.get(respondentEmail)
      : undefined;

    const submissionId = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from forms where id = ${form.id} for update`);

      const [lockedForm] = await tx
        .select({
          status: formsTable.status,
          expiresAt: formsTable.expiresAt,
          responseLimit: formsTable.responseLimit,
        })
        .from(formsTable)
        .where(eq(formsTable.id, form.id))
        .limit(1);

      if (!lockedForm) throw new Error("Form not found");
      if (lockedForm.status !== "published")
        throw new Error("This form is not accepting responses");
      if (lockedForm.expiresAt && lockedForm.expiresAt.getTime() < Date.now())
        throw new Error("This form is closed");

      if (lockedForm.responseLimit !== null) {
        const submissionCount = await tx
          .select({ value: count() })
          .from(formSubmissionsTable)
          .where(eq(formSubmissionsTable.formId, form.id));

        if ((submissionCount[0]?.value ?? 0) >= lockedForm.responseLimit) {
          throw new Error("This form has reached its response limit");
        }
      }

      const submissionInsertResult = await tx
        .insert(formSubmissionsTable)
        .values({
          formId: form.id,
          values: visibleValues,
          respondentEmail: submittedRespondentEmail,
          metadata: responseMetadata,
        })
        .returning({ id: formSubmissionsTable.id });

      const insertedSubmissionId = submissionInsertResult[0]?.id;
      if (!insertedSubmissionId) throw new Error("Failed to create submission");

      await tx.insert(responseEventsTable).values({
        formId: form.id,
        submissionId: insertedSubmissionId,
        type: "submit",
        metadata: responseMetadata,
      });

      const emailEvents = [
        creatorEmail
          ? {
              formId: form.id,
              submissionId: insertedSubmissionId,
              recipient: creatorEmail,
              type: "creator_notification",
              status: "queued",
            }
          : undefined,
        submittedRespondentEmail
          ? {
              formId: form.id,
              submissionId: insertedSubmissionId,
              recipient: submittedRespondentEmail,
              type: "respondent_confirmation",
              status: "queued",
            }
          : undefined,
      ].filter((event) => event !== undefined);

      if (emailEvents.length > 0) await tx.insert(emailEventsTable).values(emailEvents);

      return insertedSubmissionId;
    });

    return { id: submissionId };
  }

  public async getSubmissionsByFormId(input: GetSubmissionsByFormIdInputSchemaType) {
    const { formId, userId } = await getSubmissionsByFormIdInputSchema.parseAsync(input);
    await this.verifyOwner(formId, userId);

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

  public async listResponses(input: ListResponsesInputSchemaType) {
    const { formId, userId, page, pageSize } = await listResponsesInputSchema.parseAsync(input);
    await this.verifyOwner(formId, userId);

    const fields = await this.getResponseFields(formId);
    const offset = (page - 1) * pageSize;
    const [responses, totalRows] = await Promise.all([
      db
        .select({
          id: formSubmissionsTable.id,
          respondentEmail: formSubmissionsTable.respondentEmail,
          values: formSubmissionsTable.values,
          metadata: formSubmissionsTable.metadata,
          submittedAt: formSubmissionsTable.submittedAt,
          createdAt: formSubmissionsTable.createdAt,
        })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId))
        .orderBy(formSubmissionsTable.submittedAt)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ value: count() })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId)),
    ]);
    const total = totalRows[0]?.value ?? 0;

    return {
      fields,
      responses,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  public async getFormAnalytics(input: GetFormAnalyticsInputSchemaType) {
    const { formId, userId } = await getFormAnalyticsInputSchema.parseAsync(input);
    await this.verifyOwner(formId, userId);

    const [fields, submissions, events] = await Promise.all([
      this.getResponseFields(formId),
      db
        .select({
          values: formSubmissionsTable.values,
          submittedAt: formSubmissionsTable.submittedAt,
        })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId)),
      db
        .select({ type: responseEventsTable.type })
        .from(responseEventsTable)
        .where(eq(responseEventsTable.formId, formId)),
    ]);

    const totalResponses = submissions.length;
    const totalSubmissions = events.filter((event) => event.type === "submit").length;
    const totalViews = events.filter((event) => event.type === "view").length;
    const submissionsByDayMap = new Map<string, number>();

    for (const submission of submissions) {
      const date = (submission.submittedAt ?? new Date()).toISOString().slice(0, 10);
      submissionsByDayMap.set(date, (submissionsByDayMap.get(date) ?? 0) + 1);
    }

    const fieldBreakdown = fields.map((field) => {
      const optionCounts = new Map<string, number>();
      let responseCount = 0;
      let ratingTotal = 0;
      let ratingCount = 0;

      for (const submission of submissions) {
        const answer = getAnswerValue(submission.values, field.id);
        if (!answer) continue;

        if (field.type === "SINGLE_SELECT") {
          responseCount += 1;
          optionCounts.set(answer, (optionCounts.get(answer) ?? 0) + 1);
        } else if (
          field.type === "MULTI_SELECT" ||
          (field.type === "CHECKBOX" && (field.options?.length ?? 0) > 0)
        ) {
          const values = parseStringArray(answer);
          if (values.length > 0) responseCount += 1;
          for (const value of values) optionCounts.set(value, (optionCounts.get(value) ?? 0) + 1);
        } else if (field.type === "CHECKBOX") {
          responseCount += 1;
          optionCounts.set(answer, (optionCounts.get(answer) ?? 0) + 1);
        } else if (field.type === "RATING") {
          const rating = Number(answer);
          if (Number.isFinite(rating)) {
            responseCount += 1;
            ratingTotal += rating;
            ratingCount += 1;
          }
        } else if (answer.trim()) {
          responseCount += 1;
        }
      }

      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        responseCount,
        options: optionCounts.size
          ? Array.from(optionCounts.entries()).map(([value, valueCount]) => ({
              label: getAnalyticsOptionLabel(field, value),
              value,
              count: valueCount,
            }))
          : undefined,
        averageRating: ratingCount > 0 ? ratingTotal / ratingCount : undefined,
      };
    });

    return {
      totalResponses,
      totalSubmissions,
      totalViews,
      completionRate:
        totalViews > 0 ? (totalSubmissions / totalViews) * 100 : totalResponses > 0 ? 100 : 0,
      submissionsByDay: Array.from(submissionsByDayMap.entries()).map(([date, valueCount]) => ({
        date,
        count: valueCount,
      })),
      fieldBreakdown,
    };
  }

  public async exportResponsesCsv(input: ExportResponsesCsvInputSchemaType) {
    const { formId, userId } = await exportResponsesCsvInputSchema.parseAsync(input);
    const form = await this.verifyOwner(formId, userId);
    const [fields, responses] = await Promise.all([
      this.getResponseFields(formId),
      db
        .select({
          respondentEmail: formSubmissionsTable.respondentEmail,
          values: formSubmissionsTable.values,
          submittedAt: formSubmissionsTable.submittedAt,
        })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId))
        .orderBy(formSubmissionsTable.submittedAt),
    ]);

    const header = ["Submitted At", "Respondent Email", ...fields.map((field) => field.label)];
    const rows = responses.map((response) => [
      response.submittedAt?.toISOString() ?? "",
      response.respondentEmail ?? "",
      ...fields.map((field) =>
        formatResponseValueForCsv(field, getAnswerValue(response.values, field.id)),
      ),
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
    const filename = `${
      form.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "form"
    }-responses.csv`;

    return { filename, csv };
  }

}

export default FormSubmissionService;
