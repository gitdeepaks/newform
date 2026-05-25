CREATE TABLE "user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_accounts_provider_account_id_unique" ON "user_accounts" ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_accounts_user_provider_unique" ON "user_accounts" ("user_id","provider");--> statement-breakpoint
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;