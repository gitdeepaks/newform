import { and, count, db, eq, sql } from "@repo/database";
import {
  emailEventsTable,
  formFieldsTable,
  formVersionsTable,
  formsTable,
  formSubmissionsTable,
  responseAnswersTable,
  responseEventsTable,
  usersTable,
  type FormSubmissionMetadata,
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

type ResponseAnswerValue = string | string[] | number | boolean | null;
type RebuiltAnswer = { formFieldId: string; value: string };

function stringifyAnswerValue(value: ResponseAnswerValue): string {
  if (value === null) return "";
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function getAnswerValue(values: RebuiltAnswer[], fieldId: string) {
  return values.find((value) => value.formFieldId === fieldId)?.value;
}

function groupAnswersBySubmission(
  answers: { submissionId: string; fieldId: string; rawValue: ResponseAnswerValue }[],
) {
  const answerMap = new Map<string, RebuiltAnswer[]>();
  for (const answer of answers) {
    const current = answerMap.get(answer.submissionId) ?? [];
    current.push({ formFieldId: answer.fieldId, value: stringifyAnswerValue(answer.rawValue) });
    answerMap.set(answer.submissionId, current);
  }
  return answerMap;
}

function normalizeAnswerForInsert(field: PublicField & { label: string; labelKey: string }, value: string) {
  const options = field.options ?? [];
  const hasOptions = options.length > 0;
  const arrayValue = field.type === "MULTI_SELECT" || (field.type === "CHECKBOX" && hasOptions)
    ? parseStringArray(value)
    : null;
  const numberValue = field.type === "NUMBER" || field.type === "RATING" ? Number(value) : null;
  const dateValue = field.type === "DATE" && value ? new Date(value) : null;

  return {
    fieldId: field.id,
    fieldKey: field.labelKey,
    fieldLabelSnapshot: field.label,
    fieldType: field.type,
    rawValue: arrayValue ?? (numberValue !== null && Number.isFinite(numberValue) ? numberValue : value),
    normalizedText: arrayValue ? null : value,
    normalizedNumber: numberValue !== null && Number.isFinite(numberValue) ? String(numberValue) : null,
    normalizedDate: dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null,
    optionValues: arrayValue,
  };
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

    const versionRows = await db
      .select({ id: formVersionsTable.id, schemaSnapshot: formVersionsTable.schemaSnapshot })
      .from(formVersionsTable)
      .where(and(eq(formVersionsTable.formId, formId), eq(formVersionsTable.status, "active")))
      .limit(1);
    const version = versionRows[0];
    if (!version) throw new Error("Active form version not found");

    const submissionInsertResult = await db
      .insert(formSubmissionsTable)
      .values({
        formId,
        formVersionId: version.id,
        rawPayload: values,
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

    return { id: submissionInsertResult[0].id };
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

    const versionRows = await db
      .select({ id: formVersionsTable.id, schemaSnapshot: formVersionsTable.schemaSnapshot })
      .from(formVersionsTable)
      .where(and(eq(formVersionsTable.formId, form.id), eq(formVersionsTable.status, "active")))
      .limit(1);
    const activeVersion = versionRows[0];
    if (!activeVersion) throw new Error("Active form version not found");
    const fields = activeVersion.schemaSnapshot.fields;

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
          formVersionId: activeVersion.id,
          respondentEmail: submittedRespondentEmail,
          metadata: responseMetadata,
          rawPayload: visibleValues,
        })
        .returning({ id: formSubmissionsTable.id });

      const insertedSubmissionId = submissionInsertResult[0]?.id;
      if (!insertedSubmissionId) throw new Error("Failed to create submission");

      if (visibleValues.length > 0) {
        const normalizedAnswers = visibleValues.map((answer) => {
          const field = fieldById.get(answer.formFieldId);
          if (!field) throw new Error("Unknown form field submitted");
          return {
            submissionId: insertedSubmissionId,
            formId: form.id,
            formVersionId: activeVersion.id,
            ...normalizeAnswerForInsert(field, answer.value),
          };
        });
        await tx.insert(responseAnswersTable).values(normalizedAnswers);
      }

      await tx.insert(responseEventsTable).values({
        formId: form.id,
        formVersionId: activeVersion.id,
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

    const submissions = await db
      .select({
        id: formSubmissionsTable.id,
        formId: formSubmissionsTable.formId,
        createdAt: formSubmissionsTable.createdAt,
        updatedAt: formSubmissionsTable.updatedAt,
      })
      .from(formSubmissionsTable)
      .where(eq(formSubmissionsTable.formId, formId))
      .orderBy(formSubmissionsTable.createdAt);
    const answers = await db
      .select({
        submissionId: responseAnswersTable.submissionId,
        fieldId: responseAnswersTable.fieldId,
        rawValue: responseAnswersTable.rawValue,
      })
      .from(responseAnswersTable)
      .where(eq(responseAnswersTable.formId, formId));
    const answersBySubmission = groupAnswersBySubmission(answers);
    return submissions.map((submission) => ({
      ...submission,
      values: answersBySubmission.get(submission.id) ?? [],
    }));
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
    const answers = await db
      .select({
        submissionId: responseAnswersTable.submissionId,
        fieldId: responseAnswersTable.fieldId,
        rawValue: responseAnswersTable.rawValue,
      })
      .from(responseAnswersTable)
      .where(eq(responseAnswersTable.formId, formId));
    const answersBySubmission = groupAnswersBySubmission(answers);
    const total = totalRows[0]?.value ?? 0;

    return {
      fields,
      responses: responses.map((response) => ({
        ...response,
        values: answersBySubmission.get(response.id) ?? [],
      })),
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
          id: formSubmissionsTable.id,
          submittedAt: formSubmissionsTable.submittedAt,
        })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId)),
      db
        .select({ type: responseEventsTable.type })
        .from(responseEventsTable)
        .where(eq(responseEventsTable.formId, formId)),
    ]);
    const answers = await db
      .select({
        submissionId: responseAnswersTable.submissionId,
        fieldId: responseAnswersTable.fieldId,
        rawValue: responseAnswersTable.rawValue,
      })
      .from(responseAnswersTable)
      .where(eq(responseAnswersTable.formId, formId));
    const answersBySubmission = groupAnswersBySubmission(answers);

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
        const answer = getAnswerValue(answersBySubmission.get(submission.id) ?? [], field.id);
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
          id: formSubmissionsTable.id,
          respondentEmail: formSubmissionsTable.respondentEmail,
          submittedAt: formSubmissionsTable.submittedAt,
        })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId))
        .orderBy(formSubmissionsTable.submittedAt),
    ]);
    const answers = await db
      .select({
        submissionId: responseAnswersTable.submissionId,
        fieldId: responseAnswersTable.fieldId,
        rawValue: responseAnswersTable.rawValue,
      })
      .from(responseAnswersTable)
      .where(eq(responseAnswersTable.formId, formId));
    const answersBySubmission = groupAnswersBySubmission(answers);

    const header = ["Submitted At", "Respondent Email", ...fields.map((field) => field.label)];
    const rows = responses.map((response) => [
      response.submittedAt?.toISOString() ?? "",
      response.respondentEmail ?? "",
      ...fields.map((field) =>
        formatResponseValueForCsv(field, getAnswerValue(answersBySubmission.get(response.id) ?? [], field.id)),
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
