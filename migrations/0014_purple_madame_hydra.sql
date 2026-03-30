ALTER TYPE "public"."financial_provider" ADD VALUE 'quiltt';--> statement-breakpoint
ALTER TYPE "public"."sync_job_provider" ADD VALUE 'quiltt';--> statement-breakpoint
ALTER TABLE "account_connections" ADD COLUMN "quiltt_connection_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "quiltt_profile_id" text;--> statement-breakpoint
ALTER TABLE "account_connections" ADD CONSTRAINT "account_connections_quiltt_connection_id_unique" UNIQUE("quiltt_connection_id");