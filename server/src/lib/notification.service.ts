import { db } from "../db";
import { notifications, user } from "../schema";
import type { AccountDisconnectedMetadata } from "../schema";
import { eq, and, gt } from "drizzle-orm";
import { sendEmail } from "./emails/resend.client";
import { accountDisconnectEmail } from "./emails/templates/account-disconnect";

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "OpenFinance <hello@openfinance.sh>";

export const notificationService = {
  async sendAccountDisconnectEmail(params: {
    userId: string;
    connectionId: number;
    institutionName: string;
    errorMessage?: string;
  }) {
    const { userId, connectionId, institutionName, errorMessage } = params;

    // Dedup: skip if we already sent one for this user in the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          gt(notifications.sentAt, oneDayAgo),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return null;
    }

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
      errorMessage,
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
};
