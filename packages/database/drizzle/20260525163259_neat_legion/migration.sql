ALTER TABLE "form_fields" ADD COLUMN "options" json;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "validation" json;--> statement-breakpoint
ALTER TABLE "form_fields" ALTER COLUMN "type" SET DATA TYPE varchar(30) USING "type"::varchar(30);--> statement-breakpoint
UPDATE "form_fields" SET "type" = 'SHORT_TEXT' WHERE "type" IN ('TEXT', 'PASSWORD');--> statement-breakpoint
UPDATE "form_fields" SET "type" = 'CHECKBOX' WHERE "type" = 'YES_NO';--> statement-breakpoint
DROP TYPE "field_types_enum";
