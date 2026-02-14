CREATE TABLE "institution_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"primary_color" text,
	"url" text,
	"country_code" text NOT NULL,
	"provider_composite_key" text,
	"plaid_data" json,
	"mx_data" json,
	"supported_account_types" json,
	"is_top_institution" boolean DEFAULT false NOT NULL,
	"country_rank" integer,
	"last_synced" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "institution_registry_provider_composite_key_unique" UNIQUE("provider_composite_key")
);
--> statement-breakpoint
CREATE INDEX "institution_registry_name_idx" ON "institution_registry" USING btree ("name");--> statement-breakpoint
CREATE INDEX "institution_registry_country_code_idx" ON "institution_registry" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "institution_registry_last_synced_idx" ON "institution_registry" USING btree ("last_synced");