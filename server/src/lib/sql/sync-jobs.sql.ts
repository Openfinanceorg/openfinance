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
import { accountConnections } from "./account-connections.sql";

export const syncJobProviderEnum = pgEnum("sync_job_provider", ["plaid", "mx"]);

export const syncJobTypeEnum = pgEnum("sync_job_type", [
  "accounts",
  "transactions",
]);

export const syncJobStatusEnum = pgEnum("sync_job_status", [
  "pending",
  "success",
  "error",
  "expired",
]);

export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountConnectionId: integer("account_connection_id")
      .notNull()
      .references(() => accountConnections.id, { onDelete: "cascade" }),

    provider: syncJobProviderEnum("provider").notNull(),
    jobType: syncJobTypeEnum("job_type").notNull(),
    status: syncJobStatusEnum("status").notNull().default("pending"),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    recordsProcessed: integer("records_processed").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_sync_jobs_user_id").on(table.userId),
    accountConnectionIdIdx: index("idx_sync_jobs_account_connection_id").on(
      table.accountConnectionId,
    ),
    statusIdx: index("idx_sync_jobs_status").on(table.status),
  }),
);

export type SyncJob = typeof syncJobs.$inferSelect;
export type NewSyncJob = typeof syncJobs.$inferInsert;
