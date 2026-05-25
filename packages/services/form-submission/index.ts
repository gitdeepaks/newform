import { and, count, db, eq } from "@repo/database";
import {
  emailEventsTable,
  formFieldsTable,
  formsTable,
  formSubmissionsTable,
  responseEventsTable,
  usersTable,
  type FormFieldOption,
  type FormFieldValidation,
  type FormSubmissionMetadata,
} from "@repo/database/schema";
import { z } from "zod";
import {
  createSubmissionInputSchema,
  getSubmissionsByFormIdInputSchema,
  submitPublicResponseInputSchema,
  type CreateSubmissionInputSchemaType,
  type GetSubmissionsByFormIdInputSchemaType,
  type SubmitPublicResponseInputSchemaType,
} from "./model";

const submitAttempts = new Map<string, number[]>();
const rateLimitWindowMs = 10 * 60 * 1000;
const maxAttempts = 5;
const stringArraySchema = z.array(z.string());

type PublicField = {
  id: string;
  type: string;
  isRequired: boolean | null;
  options: FormFieldOption[] | null;
  validation: FormFieldValidation | null;
};

function checkRateLimit(key: string) {
  const now = Date.now();
  const attempts = (submitAttempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs,
  );

  if (attempts.length >= maxAttempts) {
    submitAttempts.set(key, attempts);
    throw new Error("Too many submissions. Please try again later.");
  }

  submitAttempts.set(key, [...attempts, now]);
}

function parseJsonArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return stringArraySchema.parse(parsed);
  } catch {
    throw new Error("Invalid multi-select value");
  }
}

function validateAnswer(field: PublicField, value: string) {
  const validation = field.validation;
  const options = field.options ?? [];
  const optionValues = new Set(options.map((option) => option.value));
  const isRequired = field.isRequired === true;

  if (field.type === "EMAIL" && value && !z.string().email().safeParse(value).success) {
    throw new Error("Invalid email address");
  }

  if (field.type === "NUMBER") {
    if (!value) return;
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) throw new Error("Invalid number value");
    if (validation?.min !== undefined && numberValue < validation.min) throw new Error("Number is too small");
    if (validation?.max !== undefined && numberValue > validation.max) throw new Error("Number is too large");
  }

  if (field.type === "SHORT_TEXT" || field.type === "LONG_TEXT") {
    if (validation?.minLength !== undefined && value.length < validation.minLength) {
      throw new Error("Text is too short");
    }
    if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
      throw new Error("Text is too long");
    }
  }

  if (field.type === "SINGLE_SELECT" && value && !optionValues.has(value)) {
    throw new Error("Invalid option value");
  }

  if (field.type === "MULTI_SELECT") {
    const values = value ? parseJsonArray(value) : [];
    if (isRequired && values.length === 0) throw new Error("Please complete all required fields");
    if (values.some((selectedValue) => !optionValues.has(selectedValue))) {
      throw new Error("Invalid option value");
    }
  }

  if (field.type === "CHECKBOX") {
    if (options.length > 0) {
      const values = value ? parseJsonArray(value) : [];
      if (isRequired && values.length === 0) throw new Error("Please complete all required fields");
      if (values.some((selectedValue) => !optionValues.has(selectedValue))) {
        throw new Error("Invalid checkbox value");
      }
    } else if (value !== "true" && value !== "false") {
      throw new Error("Invalid checkbox value");
    }
  }

  if (field.type === "RATING") {
    if (!value) return;
    const rating = Number(value);
    const ratingMax = validation?.ratingMax ?? 5;
    if (!Number.isFinite(rating) || rating < 1 || rating > ratingMax) {
      throw new Error("Invalid rating value");
    }
  }

  if (field.type === "DATE") {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date value");
    if (validation?.dateMin && value < validation.dateMin) throw new Error("Date is too early");
    if (validation?.dateMax && value > validation.dateMax) throw new Error("Date is too late");
  }
}

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
    if (form.expiresAt && form.expiresAt.getTime() < Date.now()) throw new Error("This form is closed");

    if (form.responseLimit !== null) {
      const submissionCount = await db
        .select({ value: count() })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, form.id));

      if ((submissionCount[0]?.value ?? 0) >= form.responseLimit) {
        throw new Error("This form has reached its response limit");
      }
    }

    const fields = await db
      .select({
        id: formFieldsTable.id,
        type: formFieldsTable.type,
        isRequired: formFieldsTable.isRequired,
        options: formFieldsTable.options,
        validation: formFieldsTable.validation,
      })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, form.id));

    const fieldById = new Map(fields.map((field) => [field.id, field]));
    const answerByFieldId = new Map(values.map((answer) => [answer.formFieldId, answer.value]));

    for (const answer of values) {
      const field = fieldById.get(answer.formFieldId);
      if (!field) throw new Error("Unknown form field submitted");
      validateAnswer(field, answer.value);
    }

    for (const field of fields) {
      const answer = answerByFieldId.get(field.id);
      if (field.isRequired && (!answer || answer.trim().length === 0)) {
        throw new Error("Please complete all required fields");
      }
    }

    const respondentEmail = fields.find((field) => field.type === "EMAIL")?.id;
    const responseMetadata: FormSubmissionMetadata = { ...metadata, slug };
    const submissionInsertResult = await db
      .insert(formSubmissionsTable)
      .values({
        formId: form.id,
        values,
        respondentEmail: respondentEmail ? answerByFieldId.get(respondentEmail) : undefined,
        metadata: responseMetadata,
      })
      .returning({ id: formSubmissionsTable.id });

    const submissionId = submissionInsertResult[0]?.id;
    if (!submissionId) throw new Error("Failed to create submission");

    await db.insert(responseEventsTable).values({
      formId: form.id,
      submissionId,
      type: "submit",
      metadata: responseMetadata,
    });

    await this.createEmailEvents({
      formId: form.id,
      submissionId,
      creatorEmail: form.creatorEmail ?? undefined,
      respondentEmail: respondentEmail ? answerByFieldId.get(respondentEmail) : undefined,
    });

    return { id: submissionId };
  }

  public async getSubmissionsByFormId(input: GetSubmissionsByFormIdInputSchemaType) {
    const { formId, userId } = await getSubmissionsByFormIdInputSchema.parseAsync(input);

    const formRows = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.createdBy, userId)))
      .limit(1);

    if (formRows.length === 0) {
      throw new Error(`Form With ${formId} Not Found`);
    }

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

  private async createEmailEvents({
    formId,
    submissionId,
    creatorEmail,
    respondentEmail,
  }: {
    formId: string;
    submissionId: string;
    creatorEmail?: string;
    respondentEmail?: string;
  }) {
    const events = [
      creatorEmail
        ? {
            formId,
            submissionId,
            recipient: creatorEmail,
            type: "creator_notification",
            status: "queued",
          }
        : undefined,
      respondentEmail
        ? {
            formId,
            submissionId,
            recipient: respondentEmail,
            type: "respondent_confirmation",
            status: "queued",
          }
        : undefined,
    ].filter((event) => event !== undefined);

    if (events.length > 0) await db.insert(emailEventsTable).values(events);
  }
}

export default FormSubmissionService;
