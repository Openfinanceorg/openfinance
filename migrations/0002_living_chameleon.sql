CREATE TYPE "public"."account_connection_status" AS ENUM('active', 'error', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."financial_account_status" AS ENUM('active', 'deleted', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."financial_provider" AS ENUM('plaid', 'mx');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('active', 'hidden', 'deleted');--> statement-breakpoint
CREATE TABLE "account_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "financial_provider" NOT NULL,
	"institution_registry_id" integer,
	"plaid_item_id" text,
	"plaid_access_token" text,
	"mx_member_guid" text,
	"mx_institution_code" text,
	"status" "account_connection_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_connections_plaid_item_id_unique" UNIQUE("plaid_item_id"),
	CONSTRAINT "account_connections_mx_member_guid_unique" UNIQUE("mx_member_guid")
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_connection_id" integer NOT NULL,
	"provider_account_id" text NOT NULL,
	"name" text NOT NULL,
	"official_name" text,
	"type" text NOT NULL,
	"subtype" text,
	"mask" text,
	"current_balance" numeric(19, 4),
	"available_balance" numeric(19, 4),
	"iso_currency_code" text,
	"status" "financial_account_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_financial_accounts_connection_provider_account" UNIQUE("account_connection_id","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" integer NOT NULL,
	"provider_transaction_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"iso_currency_code" text,
	"date" timestamp NOT NULL,
	"authorized_date" timestamp,
	"pending" boolean DEFAULT false NOT NULL,
	"merchant_name" text,
	"status" "transaction_status" DEFAULT 'active' NOT NULL,
	"raw" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_transactions_account_provider_transaction" UNIQUE("account_id","provider_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "account_connections" ADD CONSTRAINT "account_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_connections" ADD CONSTRAINT "account_connections_institution_registry_id_institution_registry_id_fk" FOREIGN KEY ("institution_registry_id") REFERENCES "public"."institution_registry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_account_connection_id_account_connections_id_fk" FOREIGN KEY ("account_connection_id") REFERENCES "public"."account_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_connections_user_id" ON "account_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_financial_accounts_user_id" ON "financial_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_date" ON "transactions" USING btree ("user_id","date");