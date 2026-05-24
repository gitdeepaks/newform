CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid,
	"form_field_id" uuid,
	"values" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_field_id_form_fields_id_fkey" FOREIGN KEY ("form_field_id") REFERENCES "form_fields"("id");