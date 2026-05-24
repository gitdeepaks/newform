import { and, count, db, eq, ne } from "@repo/database";
import { formFieldsTable, formsTable } from "@repo/database/schema";
import {
  createFormInputSchema,
  getFormByOwnerInputSchema,
  getFormByIdInputSchema,
  getPublicFormBySlugInputSchema,
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

    return db
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
      .select({ id: formsTable.id, status: formsTable.status, expiresAt: formsTable.expiresAt })
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

    return this.getFormById({ formId: form.id });
  }

  public async listPublicForms(input: ListPublicFormsInputSchemaType) {
    await listPublicFormsInputSchema.parseAsync(input);

    return db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        description: formsTable.description,
        slug: formsTable.slug,
        publishedAt: formsTable.publishedAt,
      })
      .from(formsTable)
      .where(and(eq(formsTable.status, "published"), eq(formsTable.visibility, "public")));
  }
}

export default FormService;
