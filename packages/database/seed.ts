import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import db from "./index";
import {
  formFieldsTable,
  formsTable,
  formSubmissionsTable,
  responseEventsTable,
  themesTable,
  usersTable,
  type ThemeTokens,
} from "./schema";

const demoEmail = "demo@example.com";
const demoPassword = "password123";
const themeNames = ["Aurora Studio", "Midnight Arcade", "Paper Garden"];
const seededSlugs = [
  "anime-convention-feedback",
  "startup-product-market-fit-survey",
  "gaming-tournament-registration",
  "private-beta-feedback",
  "internal-team-retro",
];

const themes: { name: string; category: string; tokens: ThemeTokens }[] = [
  {
    name: "Aurora Studio",
    category: "Creative",
    tokens: {
      background: "#eef2ff",
      card: "#ffffff",
      text: "#111827",
      mutedText: "#64748b",
      accent: "#7c3aed",
      accentText: "#ffffff",
      border: "#c4b5fd",
    },
  },
  {
    name: "Midnight Arcade",
    category: "Gaming",
    tokens: {
      background: "#09090b",
      card: "#18181b",
      text: "#fafafa",
      mutedText: "#a1a1aa",
      accent: "#22c55e",
      accentText: "#052e16",
      border: "#3f3f46",
    },
  },
  {
    name: "Paper Garden",
    category: "Warm",
    tokens: {
      background: "#f7f1e3",
      card: "#fffaf0",
      text: "#2f2a1f",
      mutedText: "#7c6f57",
      accent: "#d97706",
      accentText: "#fff7ed",
      border: "#e7d7b8",
    },
  },
];

const field = (label: string, type: string, index: number, options?: string[]) => ({
  id: randomUUID(),
  label,
  labelKey: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  type,
  index: index.toFixed(2),
  isRequired: true,
  options: options?.map((option) => ({
    id: option.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: option,
    value: option.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  })) ?? null,
  validation: type === "RATING" ? { ratingMax: 5 } : null,
});

async function main() {
  const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, demoEmail)).limit(1);
  let userId = existingUser[0]?.id;

  if (!userId) {
    const salt = randomBytes(16).toString("hex");
    const password = createHmac("sha256", salt).update(demoPassword).digest("hex");
    const [user] = await db
      .insert(usersTable)
      .values({ email: demoEmail, fullName: "Demo Creator", salt, password, emailVerified: true })
      .returning({ id: usersTable.id });
    userId = user?.id;
  }

  if (!userId) throw new Error("Failed to create demo user");

  const oldForms = await db.select({ id: formsTable.id }).from(formsTable).where(inArray(formsTable.slug, seededSlugs));
  const oldFormIds = oldForms.map((form) => form.id);
  if (oldFormIds.length > 0) {
    await db.delete(responseEventsTable).where(inArray(responseEventsTable.formId, oldFormIds));
    await db.delete(formSubmissionsTable).where(inArray(formSubmissionsTable.formId, oldFormIds));
    await db.delete(formFieldsTable).where(inArray(formFieldsTable.formId, oldFormIds));
    await db.delete(formsTable).where(inArray(formsTable.id, oldFormIds));
  }
  await db.delete(themesTable).where(inArray(themesTable.name, themeNames));

  const insertedThemes = await db
    .insert(themesTable)
    .values(themes.map((theme) => ({ ...theme, isPublic: true, createdBy: userId })))
    .returning({ id: themesTable.id, name: themesTable.name });
  const themeIdByName = new Map(insertedThemes.map((theme) => [theme.name, theme.id]));

  const forms = [
    {
      title: "Anime Convention Feedback",
      slug: "anime-convention-feedback",
      description: "Help improve panels, cosplay events, and artist alley for next year.",
      status: "published",
      visibility: "public",
      themeId: themeIdByName.get("Aurora Studio"),
      fields: [
        field("Email", "EMAIL", 1),
        field("Favorite event", "SINGLE_SELECT", 2, ["Cosplay contest", "Voice actor panel", "Artist alley"]),
        field("What should we improve?", "LONG_TEXT", 3),
        field("Overall rating", "RATING", 4),
      ],
    },
    {
      title: "Startup Product-Market Fit Survey",
      slug: "startup-product-market-fit-survey",
      description: "Measure user fit, urgency, and willingness to recommend.",
      status: "published",
      visibility: "public",
      themeId: themeIdByName.get("Paper Garden"),
      fields: [field("Work email", "EMAIL", 1), field("Company size", "NUMBER", 2), field("Primary use case", "SHORT_TEXT", 3), field("Must-have product?", "CHECKBOX", 4)],
    },
    {
      title: "Gaming Tournament Registration",
      slug: "gaming-tournament-registration",
      description: "Collect player details, platform, and availability for brackets.",
      status: "published",
      visibility: "public",
      themeId: themeIdByName.get("Midnight Arcade"),
      fields: [field("Player email", "EMAIL", 1), field("Gamertag", "SHORT_TEXT", 2), field("Platforms", "MULTI_SELECT", 3, ["PC", "PlayStation", "Xbox", "Switch"]), field("Available date", "DATE", 4)],
    },
    {
      title: "Private Beta Feedback",
      slug: "private-beta-feedback",
      description: "Invite-only feedback for beta customers.",
      status: "published",
      visibility: "unlisted",
      themeId: themeIdByName.get("Aurora Studio"),
      fields: [field("Email", "EMAIL", 1), field("Feedback", "LONG_TEXT", 2)],
    },
    {
      title: "Internal Team Retro",
      slug: "internal-team-retro",
      description: "Draft retro form for internal planning.",
      status: "draft",
      visibility: "public",
      themeId: themeIdByName.get("Paper Garden"),
      fields: [field("What went well?", "LONG_TEXT", 1), field("Team mood", "RATING", 2)],
    },
  ];

  for (const form of forms) {
    const [insertedForm] = await db
      .insert(formsTable)
      .values({
        title: form.title,
        slug: form.slug,
        description: form.description,
        status: form.status,
        visibility: form.visibility,
        publishedAt: form.status === "published" ? new Date() : null,
        themeId: form.themeId,
        createdBy: userId,
      })
      .returning({ id: formsTable.id });
    if (!insertedForm) continue;

    const fields = form.fields.map((formField) => ({ ...formField, formId: insertedForm.id }));
    const insertedFields = await db.insert(formFieldsTable).values(fields).returning({ id: formFieldsTable.id, label: formFieldsTable.label });

    const submissionCount = form.visibility === "public" && form.status === "published" ? 20 : 3;
    for (let index = 0; index < submissionCount; index += 1) {
      const values = insertedFields.map((insertedField) => ({
        formFieldId: insertedField.id,
        value: insertedField.label.toLowerCase().includes("email")
          ? `demo${index + 1}@example.com`
          : insertedField.label.toLowerCase().includes("rating") || insertedField.label.toLowerCase().includes("mood")
            ? `${(index % 5) + 1}`
            : `Sample answer ${index + 1}`,
      }));
      const [submission] = await db
        .insert(formSubmissionsTable)
        .values({
          formId: insertedForm.id,
          values,
          respondentEmail: `demo${index + 1}@example.com`,
          metadata: { ip: "127.0.0.1", userAgent: "Seed", slug: form.slug },
          submittedAt: new Date(Date.now() - index * 86_400_000),
        })
        .returning({ id: formSubmissionsTable.id });
      if (submission) {
        await db.insert(responseEventsTable).values({
          formId: insertedForm.id,
          submissionId: submission.id,
          type: "submission",
          metadata: { ip: "127.0.0.1", userAgent: "Seed", slug: form.slug },
        });
      }
    }

    await db.insert(responseEventsTable).values(
      Array.from({ length: submissionCount + 8 }, () => ({
        formId: insertedForm.id,
        type: "view",
        metadata: { ip: "127.0.0.1", userAgent: "Seed", slug: form.slug },
      })),
    );
  }

  console.log("Seeded demo user, themes, forms, fields, submissions, and response events.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
