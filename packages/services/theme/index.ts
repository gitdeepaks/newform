import { and, db, eq, or } from "@repo/database";
import { formsTable, themesTable } from "@repo/database/schema";
import {
  assignThemeInputSchema,
  getThemeInputSchema,
  listThemesInputSchema,
  type AssignThemeInputSchemaType,
  type GetThemeInputSchemaType,
  type ListThemesInputSchemaType,
} from "./model";

class ThemeService {
  public async listThemes(input?: ListThemesInputSchemaType) {
    const parsed = await listThemesInputSchema.parseAsync(input);

    return db
      .select({
        id: themesTable.id,
        name: themesTable.name,
        category: themesTable.category,
        tokens: themesTable.tokens,
        isPublic: themesTable.isPublic,
      })
      .from(themesTable)
      .where(
        parsed?.userId
          ? or(eq(themesTable.isPublic, true), eq(themesTable.createdBy, parsed.userId))
          : eq(themesTable.isPublic, true),
      );
  }

  public async getTheme(input: GetThemeInputSchemaType) {
    const { themeId } = await getThemeInputSchema.parseAsync(input);
    const rows = await db.select().from(themesTable).where(eq(themesTable.id, themeId)).limit(1);

    if (!rows[0]) throw new Error(`Theme With ${themeId} Not Found`);
    return rows[0];
  }

  public async assignTheme(input: AssignThemeInputSchemaType) {
    const { formId, userId, themeId } = await assignThemeInputSchema.parseAsync(input);

    const formRows = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.createdBy, userId)))
      .limit(1);

    if (!formRows[0]) throw new Error(`Form With ${formId} Not Found`);

    const theme = await this.getTheme({ themeId });
    if (!theme.isPublic && theme.createdBy !== userId) {
      throw new Error("Theme is not available for this form");
    }

    const rows = await db
      .update(formsTable)
      .set({ themeId })
      .where(eq(formsTable.id, formId))
      .returning({ id: formsTable.id, themeId: formsTable.themeId });

    if (!rows[0]?.id) throw new Error(`Form With ${formId} Not Found`);
    return rows[0];
  }
}

export default ThemeService;
