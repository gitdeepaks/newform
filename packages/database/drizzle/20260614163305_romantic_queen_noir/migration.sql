CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"full_name" varchar(80) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"salt" text,
	"password" text,
	"profile_image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" uuid,
	"action" varchar(80) NOT NULL,
	"target_type" varchar(40) NOT NULL,
	"target_id" varchar(120) NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(80) NOT NULL,
	"category" varchar(40) NOT NULL,
	"tokens" json NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(55) NOT NULL,
	"description" varchar(300),
	"slug" varchar(80) NOT NULL UNIQUE,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"visibility" varchar(20) DEFAULT 'unlisted' NOT NULL,
	"published_at" timestamp,
	"theme_id" uuid,
	"thank_you_title" varchar(120) DEFAULT 'Thanks for your response',
	"thank_you_message" varchar(300) DEFAULT 'Your submission has been recorded.',
	"expires_at" timestamp,
	"response_limit" integer,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"label" varchar(100) NOT NULL,
	"description" text,
	"label_key" varchar(100) NOT NULL,
	"placeholder" text,
	"is_required" boolean DEFAULT false,
	"index" numeric NOT NULL,
	"page_index" integer DEFAULT 0 NOT NULL,
	"type" varchar(30) NOT NULL,
	"options" json,
	"validation" json,
	"visibility_condition" json,
	"form_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "form_fields_form_id_page_index_index_unique" UNIQUE("form_id","page_index","index")
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"respondent_email" varchar(255),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	"metadata" json,
	"raw_payload" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"schema_snapshot" json NOT NULL,
	"published_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "form_versions_form_id_version_number_unique" UNIQUE("form_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "response_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"field_label_snapshot" text NOT NULL,
	"field_type" varchar(30) NOT NULL,
	"raw_value" json,
	"normalized_text" text,
	"normalized_number" numeric,
	"normalized_date" timestamp,
	"option_values" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "response_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"form_id" uuid,
	"form_version_id" uuid,
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
CREATE UNIQUE INDEX "user_accounts_provider_account_id_unique" ON "user_accounts" ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_accounts_user_provider_unique" ON "user_accounts" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "form_submissions_form_submitted_idx" ON "form_submissions" ("form_id","submitted_at");--> statement-breakpoint
CREATE INDEX "form_submissions_form_version_idx" ON "form_submissions" ("form_version_id");--> statement-breakpoint
CREATE INDEX "form_submissions_status_idx" ON "form_submissions" ("status");--> statement-breakpoint
CREATE INDEX "form_submissions_respondent_email_idx" ON "form_submissions" ("respondent_email");--> statement-breakpoint
CREATE INDEX "form_versions_form_status_idx" ON "form_versions" ("form_id","status");--> statement-breakpoint
CREATE INDEX "response_answers_submission_idx" ON "response_answers" ("submission_id");--> statement-breakpoint
CREATE INDEX "response_answers_form_field_idx" ON "response_answers" ("form_id","field_id");--> statement-breakpoint
CREATE INDEX "response_answers_form_created_idx" ON "response_answers" ("form_id","created_at");--> statement-breakpoint
CREATE INDEX "response_answers_version_field_idx" ON "response_answers" ("form_version_id","field_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_version_id_form_versions_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id");--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "response_answers" ADD CONSTRAINT "response_answers_submission_id_form_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id");--> statement-breakpoint
ALTER TABLE "response_answers" ADD CONSTRAINT "response_answers_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "response_answers" ADD CONSTRAINT "response_answers_form_version_id_form_versions_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id");--> statement-breakpoint
ALTER TABLE "response_events" ADD CONSTRAINT "response_events_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "response_events" ADD CONSTRAINT "response_events_form_version_id_form_versions_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id");--> statement-breakpoint
ALTER TABLE "response_events" ADD CONSTRAINT "response_events_submission_id_form_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id");--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_form_id_forms_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id");--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_submission_id_form_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id");