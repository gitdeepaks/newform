import { and, count, db, eq, ne } from "@repo/database";
import { formFieldsTable, formsTable, formSubmissionsTable, themesTable } from "@repo/database/schema";
import type { ThemeTokens } from "@repo/database/schema";
import { formFieldTypeSchema } from "../form-field/model";
import {
  createFormInputSchema,
  getFormByOwnerInputSchema,
  getFormByIdInputSchema,
  getPublicFormBySlugInputSchema,
  getPublicRedirectByIdInputSchema,
  listPublicFormsInputSchema,
  listFromByUserIdInputSchema,
  publishFormInputSchema,
  unpublishFormInputSchema,
  updateFormInputSchema,
  updateSlugInputSchema,
  updateVisibilityInputSchema,
  type CreateFormInputSchemaType,
  type GetFormByOwnerInputSchemaType,
  type GetFormByIdInputSchemaType,
  type GetPublicFormBySlugInputSchemaType,
  type GetPublicRedirectByIdInputSchemaType,
  type ListPublicFormsInputSchemaType,
  type ListFromByUserIdInputSchemaType,
  type PublishFormInputSchemaType,
  type UnpublishFormInputSchemaType,
  type UpdateFormInputSchemaType,
  type UpdateSlugInputSchemaType,
  type UpdateVisibilityInputSchemaType,
} from "./model";

const createSlugFromTitle = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "form";

class FormService {
  private toTheme(
    theme: {
      id: string | null;
      name: string | null;
      category: string | null;
      tokens: ThemeTokens | null;
    } | null,
  ) {
    if (!theme || !theme.id || !theme.name || !theme.category || !theme.tokens) return null;
    return {
      id: theme.id,
      name: theme.name,
      category: theme.category,
      tokens: theme.tokens,
    };
  }

  private async ensureUniqueSlug(slug: string, excludeFormId?: string) {
    let candidate = slug;
    let suffix = 2;

    while (true) {
      const rows = await db
        .select({ id: formsTable.id })
        .from(formsTable)
        .where(
          excludeFormId
            ? and(eq(formsTable.slug, candidate), ne(formsTable.id, excludeFormId))
            : eq(formsTable.slug, candidate),
        )
        .limit(1);

      if (rows.length === 0) return candidate;
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

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

  public async createForm(input: CreateFormInputSchemaType) {
    const { title, description, createdBy } = await createFormInputSchema.parseAsync(input);
    const slug = await this.ensureUniqueSlug(createSlugFromTitle(title));

    const formInsertResult = await db
      .insert(formsTable)
      .values({
        title,
        description,
        slug,
        status: "draft",
        visibility: "unlisted",
        createdBy,
      })
      .returning({
        id: formsTable.id,
        slug: formsTable.slug,
      });

    if (!formInsertResult || formInsertResult.length === 0 || !formInsertResult[0]?.id) {
      throw new Error("Failed to create form");
    }

    return {
      id: formInsertResult[0].id,
      slug: formInsertResult[0].slug,
    };
  }

  public async listFromByUserId(input: ListFromByUserIdInputSchemaType) {
    const { userId } = await listFromByUserIdInputSchema.parseAsync(input);

    const rows = await db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        description: formsTable.description,
        slug: formsTable.slug,
        status: formsTable.status,
        visibility: formsTable.visibility,
        publishedAt: formsTable.publishedAt,
        createdAt: formsTable.createdAt,
        updatedAt: formsTable.updatedAt,
      })
      .from(formsTable)
      .where(eq(formsTable.createdBy, userId));

    return rows;
  }

  public async getFormById(input: GetFormByIdInputSchemaType) {
    const { formId } = await getFormByIdInputSchema.parseAsync(input);

    const rows = await db
      .select({
        form: {
          id: formsTable.id,
          title: formsTable.title,
          description: formsTable.description,
          slug: formsTable.slug,
          status: formsTable.status,
          visibility: formsTable.visibility,
          thankYouTitle: formsTable.thankYouTitle,
          thankYouMessage: formsTable.thankYouMessage,
          publishedAt: formsTable.publishedAt,
          expiresAt: formsTable.expiresAt,
          responseLimit: formsTable.responseLimit,
        },
        theme: {
          id: themesTable.id,
          name: themesTable.name,
          category: themesTable.category,
          tokens: themesTable.tokens,
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
          options: formFieldsTable.options,
          validation: formFieldsTable.validation,
          formId: formFieldsTable.formId,
          createdAt: formFieldsTable.createdAt,
          updatedAt: formFieldsTable.updatedAt,
        },
      })
      .from(formsTable)
      .leftJoin(themesTable, eq(themesTable.id, formsTable.themeId))
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
      .filter((field): field is NonNullable<typeof field> => field !== null)
      .map((field) => ({ ...field, type: formFieldTypeSchema.parse(field.type) }));

    return {
      ...form,
      theme: this.toTheme(firstRow.theme),
      fields,
    };
  }

  public async getFormByOwner(input: GetFormByOwnerInputSchemaType) {
    const { formId, userId } = await getFormByOwnerInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);
    return this.getFormById({ formId });
  }

  public async updateForm(input: UpdateFormInputSchemaType) {
    const { formId, userId, ...updates } = await updateFormInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);

    const rows = await db
      .update(formsTable)
      .set(updates)
      .where(eq(formsTable.id, formId))
      .returning({ id: formsTable.id });

    if (!rows[0]?.id) throw new Error(`Form With ${formId} Not Found`);
    return { id: rows[0].id };
  }

  public async publishForm(input: PublishFormInputSchemaType) {
    const { formId, userId } = await publishFormInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);

    const fieldCountRows = await db
      .select({ value: count() })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId));

    if ((fieldCountRows[0]?.value ?? 0) === 0) {
      throw new Error("Add at least one field before publishing");
    }

    const rows = await db
      .update(formsTable)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(formsTable.id, formId))
      .returning({ id: formsTable.id, slug: formsTable.slug });

    if (!rows[0]?.id) throw new Error(`Form With ${formId} Not Found`);
    return rows[0];
  }

  public async unpublishForm(input: UnpublishFormInputSchemaType) {
    const { formId, userId } = await unpublishFormInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);

    const rows = await db
      .update(formsTable)
      .set({ status: "draft" })
      .where(eq(formsTable.id, formId))
      .returning({ id: formsTable.id });

    if (!rows[0]?.id) throw new Error(`Form With ${formId} Not Found`);
    return { id: rows[0].id };
  }

  public async updateVisibility(input: UpdateVisibilityInputSchemaType) {
    const { formId, userId, visibility } = await updateVisibilityInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);

    const rows = await db
      .update(formsTable)
      .set({ visibility })
      .where(eq(formsTable.id, formId))
      .returning({ id: formsTable.id });

    if (!rows[0]?.id) throw new Error(`Form With ${formId} Not Found`);
    return { id: rows[0].id };
  }

  public async updateSlug(input: UpdateSlugInputSchemaType) {
    const { formId, userId, slug } = await updateSlugInputSchema.parseAsync(input);
    await this.assertFormOwner(formId, userId);
    const uniqueSlug = await this.ensureUniqueSlug(slug, formId);

    if (uniqueSlug !== slug) {
      throw new Error("Slug is already taken");
    }

    const rows = await db
      .update(formsTable)
      .set({ slug })
      .where(eq(formsTable.id, formId))
      .returning({ id: formsTable.id, slug: formsTable.slug });

    if (!rows[0]?.id) throw new Error(`Form With ${formId} Not Found`);
    return rows[0];
  }

  public async getPublicFormBySlug(input: GetPublicFormBySlugInputSchemaType) {
    const { slug } = await getPublicFormBySlugInputSchema.parseAsync(input);

    const rows = await db
      .select({
        id: formsTable.id,
        status: formsTable.status,
        expiresAt: formsTable.expiresAt,
        responseLimit: formsTable.responseLimit,
      })
      .from(formsTable)
      .where(eq(formsTable.slug, slug))
      .limit(1);

    const form = rows[0];
    if (!form || form.status !== "published") {
      throw new Error(`Form With ${slug} Not Found`);
    }

    if (form.expiresAt && form.expiresAt.getTime() < Date.now()) {
      throw new Error("This form is closed");
    }

    if (form.responseLimit !== null) {
      const submissionCount = await db
        .select({ value: count() })
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, form.id));

      if ((submissionCount[0]?.value ?? 0) >= form.responseLimit) {
        throw new Error("This form has reached its response limit");
      }
    }

    return this.getFormById({ formId: form.id });
  }

  public async getPublicRedirectById(input: GetPublicRedirectByIdInputSchemaType) {
    const { formId } = await getPublicRedirectByIdInputSchema.parseAsync(input);

    const rows = await db
      .select({
        slug: formsTable.slug,
        status: formsTable.status,
        expiresAt: formsTable.expiresAt,
      })
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);

    const form = rows[0];
    if (!form || form.status !== "published") {
      throw new Error(`Form With ${formId} Not Found`);
    }

    if (form.expiresAt && form.expiresAt.getTime() < Date.now()) {
      throw new Error("This form is closed");
    }

    return { slug: form.slug };
  }

  public async listPublicForms(input: ListPublicFormsInputSchemaType) {
    await listPublicFormsInputSchema.parseAsync(input);

    const rows = await db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        description: formsTable.description,
        slug: formsTable.slug,
        publishedAt: formsTable.publishedAt,
        theme: {
          id: themesTable.id,
          name: themesTable.name,
          category: themesTable.category,
          tokens: themesTable.tokens,
        },
      })
      .from(formsTable)
      .leftJoin(themesTable, eq(themesTable.id, formsTable.themeId))
      .where(and(eq(formsTable.status, "published"), eq(formsTable.visibility, "public")));

    return rows.map(({ theme, ...form }) => ({ ...form, theme: this.toTheme(theme) }));
  }
}

export default FormService;
