import { db } from "../db";
import {
  notifications,
  user,
  accountConnections,
  institutionRegistry,
} from "../schema";
import type {
  AccountDisconnectedMetadata,
  TransactionSyncMetadata,
} from "../schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { sendEmail } from "./emails/resend.client";
import { accountDisconnectEmail } from "./emails/templates/account-disconnect";

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "OpenFinance <hello@openfinance.sh>";

export const notificationService = {
  async sendAccountDisconnectEmail(params: {
    userId: string;
    connectionId: number;
    errorMessage?: string;
  }) {
    const { userId, connectionId, errorMessage } = params;

    // Dedup: skip if we already sent one for this connection in the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          gt(notifications.sentAt, oneDayAgo),
          sql`${notifications.metadata}->>'connectionId' = ${String(connectionId)}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return null;
    }

    // Look up institution name from connection
    const [institution] = await db
      .select({ name: institutionRegistry.name, url: institutionRegistry.url })
      .from(accountConnections)
      .innerJoin(
        institutionRegistry,
        eq(accountConnections.institutionRegistryId, institutionRegistry.id),
      )
      .where(eq(accountConnections.id, connectionId))
      .limit(1);
    const institutionName = institution?.name ?? "your financial institution";

    // Fetch user email and name
    const [row] = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!row) {
      throw new Error(`User ${userId} not found`);
    }

    const { subject, html } = accountDisconnectEmail({
      userName: row.name,
      institutionName,
    });

    await sendEmail({
      from: EMAIL_FROM,
      to: row.email,
      subject,
      html,
    });

    const metadata: AccountDisconnectedMetadata = {
      type: "account_disconnected",
      connectionId,
      institutionName,
      institutionUrl: institution?.url ?? null,
      ...(errorMessage && { errorMessage }),
    };

    // Log the notification
    const [log] = await db
      .insert(notifications)
      .values({
        userId,
        channel: "email",
        title: subject,
        metadata,
      })
      .returning();

    return log;
  },

  async logTransactionSync(params: {
    userId: string;
    connectionId: number;
    added: number;
    modified: number;
    removed: number;
  }) {
    const { userId, connectionId, added, modified, removed } = params;

    const total = added + modified + removed;
    if (total === 0) return null;

    const [institution] = await db
      .select({
        name: institutionRegistry.name,
        url: institutionRegistry.url,
      })
      .from(accountConnections)
      .innerJoin(
        institutionRegistry,
        eq(accountConnections.institutionRegistryId, institutionRegistry.id),
      )
      .where(eq(accountConnections.id, connectionId))
      .limit(1);

    const institutionName = institution?.name ?? "Unknown institution";

    const metadata: TransactionSyncMetadata = {
      type: "transaction_sync",
      connectionId,
      institutionName,
      institutionUrl: institution?.url ?? null,
      added,
      modified,
      removed,
    };

    const [log] = await db
      .insert(notifications)
      .values({
        userId,
        channel: "system",
        title: `Synced ${total} transaction${total === 1 ? "" : "s"}`,
        metadata,
      })
      .returning();

    return log;
  },
};
