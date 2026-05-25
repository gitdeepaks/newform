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
ALTER TABLE "themes" ADD CONSTRAINT "themes_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");