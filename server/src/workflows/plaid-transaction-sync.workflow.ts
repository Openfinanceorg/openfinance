import { DBOS } from "@dbos-inc/dbos-sdk";
import { db } from "../db";
import { accountConnections, syncJobs } from "../schema";
import { eq } from "drizzle-orm";
import { plaidService } from "../lib/sync/plaid.service";
import { notificationService } from "../lib/notification.service";

const PLAID_DISCONNECT_ERRORS = [
  "ITEM_LOGIN_REQUIRED",
  "ITEM_LOCKED",
  "INVALID_CREDENTIALS",
  "ACCESS_NOT_GRANTED",
  "PASSWORD_RESET_REQUIRED",
];

function isDisconnectError(message: string): boolean {
  return PLAID_DISCONNECT_ERRORS.some((p) => message.includes(p));
}

export class PlaidTransactionSyncWorkflow {
  @DBOS.step()
  static async fetchConnection(connectionId: number) {
    const rows = await db
      .select()
      .from(accountConnections)
      .where(eq(accountConnections.id, connectionId))
      .limit(1);
    return rows[0] ?? null;
  }

  @DBOS.step()
  static async runSync(params: {
    connectionId: number;
    accessToken: string;
    cursor: string | null;
  }) {
    return plaidService.syncTransactions(params);
  }

  @DBOS.step()
  static async markComplete(syncJobId: number, recordsProcessed: number) {
    await db
      .update(syncJobs)
      .set({
        status: "success",
        completedAt: new Date(),
        recordsProcessed,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, syncJobId));
  }

  @DBOS.step()
  static async markStarted(syncJobId: number) {
    await db
      .update(syncJobs)
      .set({ startedAt: new Date(), updatedAt: new Date() })
      .where(eq(syncJobs.id, syncJobId));
  }

  @DBOS.step()
  static async markError(
    syncJobId: number,
    errorMessage: string,
    errorCode?: string,
  ) {
    await db
      .update(syncJobs)
      .set({
        status: "error",
        completedAt: new Date(),
        errorMessage,
        errorCode: errorCode ?? null,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, syncJobId));
  }

  @DBOS.step()
  static async notifyDisconnect(
    userId: string,
    connectionId: number,
    errorMessage?: string,
  ) {
    try {
      await notificationService.sendAccountDisconnectEmail({
        userId,
        connectionId,
        errorMessage,
      });
    } catch (e) {
      DBOS.logger.error(
        `Failed to send disconnect notification for connection ${connectionId}: ${e}`,
      );
    }
  }

  @DBOS.step()
  static async notifySync(
    userId: string,
    connectionId: number,
    added: number,
    modified: number,
    removed: number,
  ) {
    try {
      await notificationService.logTransactionSync({
        userId,
        connectionId,
        added,
        modified,
        removed,
      });
    } catch (e) {
      DBOS.logger.error(
        `Failed to log sync notification for connection ${connectionId}: ${e}`,
      );
    }
  }

  @DBOS.workflow()
  static async run(input: {
    connectionId: number;
    userId: string;
    syncJobId: number;
  }): Promise<{ added: number; modified: number; removed: number } | null> {
    const { connectionId, syncJobId } = input;

    await PlaidTransactionSyncWorkflow.markStarted(syncJobId);

    const connection =
      await PlaidTransactionSyncWorkflow.fetchConnection(connectionId);

    if (!connection || !connection.plaidAccessToken) {
      await PlaidTransactionSyncWorkflow.markError(
        syncJobId,
        "Connection not found or missing access token",
      );
      return null;
    }

    try {
      const result = await PlaidTransactionSyncWorkflow.runSync({
        connectionId,
        accessToken: connection.plaidAccessToken,
        cursor: connection.transactionCursor,
      });

      const total = result.added + result.modified + result.removed;
      await PlaidTransactionSyncWorkflow.markComplete(syncJobId, total);
      if (total > 0) {
        await PlaidTransactionSyncWorkflow.notifySync(
          input.userId,
          connectionId,
          result.added,
          result.modified,
          result.removed,
        );
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      const errorCode = isDisconnectError(message)
        ? "ITEM_LOGIN_REQUIRED"
        : undefined;
      await PlaidTransactionSyncWorkflow.markError(
        syncJobId,
        message,
        errorCode,
      );
      DBOS.logger.error(
        `Transaction sync failed for connection ${connectionId}: ${message}`,
      );

      if (errorCode) {
        await PlaidTransactionSyncWorkflow.notifyDisconnect(
          input.userId,
          connectionId,
          message,
        );
      }

      return null;
    }
  }
}
