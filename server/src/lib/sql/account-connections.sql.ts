import {
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth.sql";
import { institutionRegistry } from "./institution-registry.sql";

export const financialProviderEnum = pgEnum("financial_provider", [
  "plaid",
  "mx",
]);

export const accountConnectionStatusEnum = pgEnum("account_connection_status", [
  "active",
  "error",
  "revoked",
]);

export const accountConnections = pgTable(
  "account_connections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: financialProviderEnum("provider").notNull(),
    institutionRegistryId: integer("institution_registry_id").references(
      () => institutionRegistry.id,
      { onDelete: "set null" },
    ),

    // Plaid item identifiers (nullable for MX)
    plaidItemId: text("plaid_item_id").unique(),
    plaidAccessToken: text("plaid_access_token"),

    // MX member identifiers (nullable for Plaid)
    mxMemberGuid: text("mx_member_guid").unique(),
    mxInstitutionCode: text("mx_institution_code"),

    status: accountConnectionStatusEnum("status").notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_account_connections_user_id").on(table.userId),
  }),
);

export type AccountConnection = typeof accountConnections.$inferSelect;
export type NewAccountConnection = typeof accountConnections.$inferInsert;
