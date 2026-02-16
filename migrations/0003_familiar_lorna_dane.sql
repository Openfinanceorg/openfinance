CREATE TYPE "public"."sync_job_provider" AS ENUM('plaid', 'mx');--> statement-breakpoint
CREATE TYPE "public"."sync_job_status" AS ENUM('pending', 'success', 'error', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sync_job_type" AS ENUM('accounts', 'transactions');--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_connection_id" integer NOT NULL,
	"provider" "sync_job_provider" NOT NULL,
	"job_type" "sync_job_type" NOT NULL,
	"status" "sync_job_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_account_connection_id_account_connections_id_fk" FOREIGN KEY ("account_connection_id") REFERENCES "public"."account_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sync_jobs_user_id" ON "sync_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sync_jobs_account_connection_id" ON "sync_jobs" USING btree ("account_connection_id");--> statement-breakpoint
CREATE INDEX "idx_sync_jobs_status" ON "sync_jobs" USING btree ("status");