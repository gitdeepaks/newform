CREATE TYPE "field_types_enum" AS ENUM('TEXT', 'NUMBER', 'EMAIL', 'YES_NO', 'PASSWORD');--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"label" varchar(100) NOT NULL,
	"description" text,
	"label_key" varchar(100) NOT NULL,
	"placeholder" text,
	"is_required" boolean DEFAULT false,
	"index" numeric NOT NULL,
	"type" "field_types_enum" NOT NULL,
	"form_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "form_fields_form_id_index_unique" UNIQUE("form_id","index")
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");