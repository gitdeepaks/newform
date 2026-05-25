# Priority 3 Plan: Public Submission Validation, Rate Limit, Email Events

Goal: move public form submission from weak `formId + values` to production-style `slug + answers`, with server-side validation, spam protection, and email event logging.

Mandatory implementation order:

```txt
DB -> service -> tRPC Procedure -> hook -> UI
```

Principles:

- Keep code simple and powerful for hackathon evaluation.
- Keep end-to-end type safety with Drizzle, Zod, tRPC, and typed hooks.
- Avoid unsafe typecasting.
- Do not add a real email provider yet.
- Store/log email events only.
- Do not overbuild queues, Redis, CAPTCHA, or advanced analytics in this priority.

## Current State

- Public form loads by slug using `getPublicFormBySlug`.
- Public submit still uses `submitForm({ formId, values })`.
- `form_submissions.values` stores `{ formFieldId, value: string }[]`.
- Submission validation is weak.
- No rate limit exists.
- No honeypot exists.
- No email events exist.
- Submission ownership checks for dashboard responses are still weak.
- tRPC context does not expose request IP/user-agent metadata yet.

## Step 1: DB

Files:

- `packages/database/models/form-submission.ts`
- `packages/database/schema.ts`
- `packages/database/models/response-event.ts`
- `packages/database/models/email-event.ts`

### 1.1 Improve `form_submissions`

Keep the existing table name to avoid unnecessary refactor cost.

Add columns:

```ts
respondentEmail: varchar("respondent_email", { length: 255 })
metadata: json("metadata").$type<FormSubmissionMetadata | null>()
submittedAt: timestamp("submitted_at").defaultNow()
```

Recommended metadata type:

```ts
export type FormSubmissionMetadata = {
  ip?: string;
  userAgent?: string;
  slug?: string;
};
```

Keep current values shape for now:

```ts
values: json("values").$type<FormSubmissionValueRow>()
```

Reason:

- Current public form UI already serializes multi values to strings.
- Avoid a large response storage rewrite during hackathon time.

### 1.2 Add `response_events`

Purpose:

- Track submissions now.
- Support analytics later.

Table shape:

```ts
responseEventsTable = pgTable("response_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id),
  submissionId: uuid("submission_id").references(() => formSubmissionsTable.id),
  type: varchar("type", { length: 30 }).notNull(),
  metadata: json("metadata").$type<FormSubmissionMetadata | null>(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

For Priority 3:

- Insert `submit` event after successful submission.
- `view` event can be added later if needed.

### 1.3 Add `email_events`

Purpose:

- Production-style email flow without a real provider.

Table shape:

```ts
emailEventsTable = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id),
  submissionId: uuid("submission_id").references(() => formSubmissionsTable.id),
  recipient: varchar("recipient", { length: 255 }),
  type: varchar("type", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Event types:

- `creator_notification`
- `respondent_confirmation`

Statuses:

- `queued`
- `sent`
- `failed`
- `skipped`

### DB Acceptance

- Existing submissions still work.
- New submissions can store metadata and `submittedAt`.
- Successful public submission can create response event rows.
- Successful public submission can create email event rows.

## Step 2: Service

Files:

- `packages/services/form-submission/model.ts`
- `packages/services/form-submission/index.ts`

### 2.1 New Input Schema

Add:

```ts
publicAnswerSchema = z.object({
  formFieldId: z.string(),
  value: z.string(),
});
```

Add:

```ts
submitPublicResponseInputSchema = z.object({
  slug: z.string().min(3).max(80),
  values: z.array(publicAnswerSchema),
  honeypot: z.string().optional(),
  metadata: z
    .object({
      ip: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});
```

Keep old `createSubmissionInputSchema` temporarily for backward compatibility, but final UI should use `submitPublicResponse`.

### 2.2 Output Schema

```ts
submitPublicResponseOutputSchema = z.object({
  id: z.string(),
});
```

### 2.3 Rate Limiter

Use a simple in-memory limiter inside the service file:

```ts
const submitAttempts = new Map<string, number[]>();
```

Helper:

```ts
checkRateLimit(key: string)
```

Rules:

- key: `${ip ?? "unknown"}:${slug}`
- window: 10 minutes
- max attempts: 5
- remove old timestamps on every check
- throw a friendly error if exceeded

This is enough for demo and hackathon evaluation.

### 2.4 Main Method

Add:

```ts
submitPublicResponse(input)
```

Flow:

1. Parse input with Zod.
2. Reject if `honeypot` has any non-empty value.
3. Rate limit by IP + slug.
4. Load form by slug with fields and owner email.
5. Reject if form does not exist.
6. Reject if form status is not `published`.
7. Reject if form is expired.
8. Reject if response limit has been reached.
9. Validate every answer against stored field schema.
10. Extract respondent email if an email field exists.
11. Insert submission row.
12. Insert response event row with type `submit`.
13. Insert creator email event.
14. Insert respondent confirmation email event if respondent email exists.
15. Return submission id.

### 2.5 Public Answer Validation

Build lookup maps:

```ts
const fieldById = new Map(fields.map((field) => [field.id, field]));
const answerByFieldId = new Map(values.map((answer) => [answer.formFieldId, answer.value]));
```

Rules:

- Reject unknown field ids.
- Required fields must be present and non-empty.
- `EMAIL`: must be valid email.
- `NUMBER`: must be valid number and respect min/max.
- `SHORT_TEXT` and `LONG_TEXT`: must respect minLength/maxLength.
- `SINGLE_SELECT`: value must match one configured option.
- `MULTI_SELECT`: parse JSON string array and ensure every value matches configured options.
- `CHECKBOX`:
  - if options exist, parse JSON string array and ensure every value matches configured options.
  - if no options, value must be `"true"` or `"false"`.
- `RATING`: number must be between 1 and `ratingMax`.
- `DATE`: valid date string and respect dateMin/dateMax.

Safe JSON parsing helper:

```ts
const stringArraySchema = z.array(z.string());

function parseJsonArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return stringArraySchema.parse(parsed);
  } catch {
    throw new Error("Invalid multi-select value");
  }
}
```

No unsafe typecasting.

### 2.6 Response Limit Check

If `form.responseLimit` exists:

- count existing submissions for the form
- reject if count is greater than or equal to limit

### 2.7 Email Event Insert

No real email provider.

Add helper:

```ts
createEmailEvents({ formId, submissionId, creatorEmail, respondentEmail })
```

Events:

- Creator notification:
  - recipient: creator email
  - type: `creator_notification`
  - status: `queued`
- Respondent confirmation:
  - recipient: respondent email
  - type: `respondent_confirmation`
  - status: `queued`

If respondent email is missing:

- skip respondent event

### Service Acceptance

- Draft/unpublished forms cannot accept submissions.
- Unknown field ids are rejected.
- Required fields are enforced server-side.
- Invalid field values are rejected server-side.
- Rate limit blocks repeated spam.
- Honeypot blocks bots.
- Successful submission creates:
  - submission row
  - response event row
  - email event row(s)

## Step 3: tRPC Procedure

Files:

- `packages/trpc/server/context.ts`
- `packages/trpc/server/routes/form/model.ts`
- `packages/trpc/server/routes/form/route.ts`

### 3.1 Context Metadata

Update context type:

```ts
TRPCContext {
  requestMeta: {
    ip?: string;
    userAgent?: string;
  };
}
```

Read from Express request:

- `x-forwarded-for`
- `req.ip`
- `req.socket.remoteAddress`
- `user-agent`

Simple logic:

```ts
const forwardedFor = req.headers["x-forwarded-for"];
const ip = Array.isArray(forwardedFor)
  ? forwardedFor[0]
  : forwardedFor?.split(",")[0] ?? req.ip ?? req.socket.remoteAddress;

const userAgent = req.headers["user-agent"];
```

### 3.2 Add tRPC Schemas

Add:

```ts
submitPublicResponseInputSchema
submitPublicResponseOutputSchema
```

Input from frontend:

- `slug`
- `values`
- `honeypot`

Do not accept metadata from UI. Attach metadata from `ctx.requestMeta`.

### 3.3 Add Procedure

Add public procedure:

```ts
submitPublicResponse
```

Implementation:

```ts
.input(submitPublicResponseInputSchema)
.output(submitFormOutputSchema)
.mutation(async ({ input, ctx }) => {
  return formSubmissionService.submitPublicResponse({
    ...input,
    metadata: ctx.requestMeta,
  });
})
```

Keep old `submitForm` temporarily, but stop using it in final public slug UI.

### 3.4 OpenAPI

Add metadata:

```ts
method: "POST"
path: "/form/submitPublicResponse"
tags: ["Form"]
```

### tRPC Acceptance

- Public submit endpoint uses slug.
- Request metadata comes from server context, not client.
- Scalar docs show public response submit endpoint.

## Step 4: Hook

File:

- `apps/web/hooks/api/form/index.ts`

Add:

```ts
useSubmitPublicResponse()
```

Uses:

```ts
trpc.form.submitPublicResponse.useMutation()
```

On success invalidate:

- `form.getPublicFormBySlug`
- `form.getSubmissions`

Keep old `useSubmitForm` for the old `/form/[form_id]` route.

### Hook Acceptance

- `/f/[slug]` can submit without form id.
- Old route remains working if needed.

## Step 5: UI

File:

- `apps/web/app/f/[slug]/page.tsx`

### 5.1 Use New Hook

Replace:

```ts
useSubmitForm()
```

with:

```ts
useSubmitPublicResponse()
```

Submit payload:

```ts
{
  slug,
  values,
  honeypot,
}
```

Remove `formId` from public slug submission.

### 5.2 Honeypot

Add hidden field state:

```ts
const [honeypot, setHoneypot] = useState("");
```

Render hidden input:

```tsx
<input
  tabIndex={-1}
  autoComplete="off"
  className="hidden"
  value={honeypot}
  onChange={(event) => setHoneypot(event.target.value)}
/>
```

### 5.3 Client Validation

Keep current client required validation for UX.

Server validation is the source of truth.

### 5.4 Error Messaging

If server rejects:

- show toast with server error message

### UI Acceptance

- Public form submits with slug.
- No `formId` is needed in public slug submission.
- Honeypot exists.
- Thank-you screen still works.
- Server blocks invalid submissions even if the client is bypassed.

## Step 6: Optional Response Page Polish

File:

- `apps/web/app/dashboard/forms/[id]/submissions/page.tsx`

Optional improvements after core Priority 3:

- Rename visible copy from `Submissions` to `Responses` if needed.
- Format JSON array values:
  - `[
"AI","Frontend"]` -> `AI, Frontend`

## Step 7: Verification

Commands:

```sh
pnpm db:generate
pnpm db:migrate
pnpm check-types
pnpm build
```

Manual tests:

1. Create and publish a form.
2. Open `/f/[slug]`.
3. Submit empty form and confirm client catches required errors.
4. Submit valid form and confirm thank-you screen.
5. Confirm `form_submissions` row is created.
6. Confirm `response_events` row is created.
7. Confirm `email_events` row is created.
8. Submit same form rapidly 6 times and confirm rate limit blocks.
9. Unpublish form and confirm public submit fails.
10. Try invalid option value through API/Scalar if possible and confirm it fails.
11. Open dashboard responses and confirm the response appears.

## What Not To Build In Priority 3

- No real email provider.
- No background job queue.
- No Redis rate limiting.
- No CAPTCHA.
- No complex analytics dashboard.
- No full response storage rewrite.
- No admin moderation.

## Recommended Implementation Slices

### Slice A: DB + Service

- Add metadata/email/response event tables.
- Implement `submitPublicResponse`.
- Add answer validation helper.
- Add in-memory rate limiter.

### Slice B: tRPC + Hook

- Add context metadata.
- Add `submitPublicResponse` procedure.
- Add `useSubmitPublicResponse`.

### Slice C: UI

- Update `/f/[slug]`.
- Add honeypot.
- Use slug submit.

### Slice D: Verify

- Generate migration.
- Run migration.
- Run typecheck.
- Run build.
- Manually test valid submission, invalid submission, and rate limit.

## Suggested First Coding Step

Start with DB models:

1. Extend `form-submission.ts`.
2. Add `response-event.ts`.
3. Add `email-event.ts`.
4. Export them in `schema.ts`.

Then move to service validation.
