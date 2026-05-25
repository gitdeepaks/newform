CREATE TABLE "response_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid,
	"submission_id" uuid,
	"type" varchar(30) NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid,
	"submission_id" uuid,
	"recipient" varchar(255),
	"type" varchar(40) NOT NULL,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "respondent_email" varchar(255);--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "submitted_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "response_events" ADD CONSTRAINT "response_events_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "response_events" ADD CONSTRAINT "response_events_submission_id_form_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id");--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_submission_id_form_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id");