ALTER TABLE "form_fields" ADD COLUMN "page_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "visibility_condition" json;--> statement-breakpoint
ALTER TABLE "form_fields" DROP CONSTRAINT IF EXISTS "form_fields_form_id_index_unique";--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_page_index_index_unique" UNIQUE("form_id","page_index","index");
