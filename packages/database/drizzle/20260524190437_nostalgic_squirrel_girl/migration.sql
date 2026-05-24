ALTER TABLE "forms" ADD COLUMN "slug" varchar(80);--> statement-breakpoint
UPDATE "forms" SET "slug" = 'form-' || substring("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "status" varchar(20) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "visibility" varchar(20) DEFAULT 'unlisted' NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "theme_id" uuid;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "thank_you_title" varchar(120) DEFAULT 'Thanks for your response';--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "thank_you_message" varchar(300) DEFAULT 'Your submission has been recorded.';--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "response_limit" integer;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_slug_key" UNIQUE("slug");
