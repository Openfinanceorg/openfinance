import {
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  json,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { financialAccounts } from "./financial-accounts";

export const transactionStatusEnum = pgEnum("transaction_status", [
  "active",
  "hidden",
  "deleted",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    providerTransactionId: text("provider_transaction_id").notNull(),

    name: text("name").notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    isoCurrencyCode: text("iso_currency_code"),
    date: timestamp("date", { mode: "date" }).notNull(),
    authorizedDate: timestamp("authorized_date", { mode: "date" }),
    pending: boolean("pending").notNull().default(false),
    merchantName: text("merchant_name"),

    status: transactionStatusEnum("status").notNull().default("active"),
    raw: json("raw"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    accountProviderTransactionUnique: unique(
      "uq_transactions_account_provider_transaction",
    ).on(table.accountId, table.providerTransactionId),
    userDateIdx: index("idx_transactions_user_date").on(
      table.userId,
      table.date,
    ),
  }),
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
