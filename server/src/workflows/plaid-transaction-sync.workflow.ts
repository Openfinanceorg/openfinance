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

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function isDisconnectError(message: string): boolean {
  return PLAID_DISCONNECT_ERRORS.some((p) => message.includes(p));
}

type FreshnessResult =
  | { kind: "fresh" }
  | { kind: "stale"; userMessage: string; technicalMessage: string }
  | { kind: "item_error"; userMessage: string; technicalMessage: string }
  | { kind: "unknown" };

const STALE_USER_MESSAGE =
  "Your bank hasn't sent new transactions in a while. Please reconnect to resume syncing.";
const ITEM_ERROR_USER_MESSAGE =
  "Your bank connection needs to be reauthorized. Please reconnect.";

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
  static async refreshBalances(connectionId: number, accessToken: string) {
    return plaidService.refreshBalances(connectionId, accessToken);
  }

  @DBOS.step()
  static async checkItemFreshness(
    accessToken: string,
  ): Promise<FreshnessResult> {
    let status: Awaited<ReturnType<typeof plaidService.getItemStatus>>;
    try {
      status = await plaidService.getItemStatus(accessToken);
    } catch (err) {
      DBOS.logger.warn(
        `Item status check failed: ${err instanceof Error ? err.message : err}`,
      );
      return { kind: "unknown" };
    }

    if (status.itemError) {
      const code =
        (status.itemError as { error_code?: string }).error_code ?? "ITEM_ERROR";
      const technicalMessage = `Plaid item error: ${code}`;
      DBOS.logger.info(technicalMessage);
      return {
        kind: "item_error",
        userMessage: ITEM_ERROR_USER_MESSAGE,
        technicalMessage,
      };
    }

    const { lastSuccessfulUpdate, lastFailedUpdate, itemCreatedAt } = status;
    const isFailing =
      lastFailedUpdate !== null &&
      (lastSuccessfulUpdate === null ||
        lastFailedUpdate > lastSuccessfulUpdate);

    if (!isFailing) return { kind: "fresh" };

    const baseline = lastSuccessfulUpdate ?? itemCreatedAt;
    const ageMs = baseline ? Date.now() - baseline.getTime() : Infinity;
    if (ageMs <= STALE_THRESHOLD_MS) return { kind: "fresh" };

    const ageHours = Math.round(ageMs / (60 * 60 * 1000));
    const technicalMessage =
      `Plaid upstream pull stale: last_successful_update=${lastSuccessfulUpdate?.toISOString() ?? "never"} ` +
      `(${ageHours}h ago), last_failed_update=${lastFailedUpdate?.toISOString() ?? "never"}`;
    DBOS.logger.info(technicalMessage);
    return {
      kind: "stale",
      userMessage: STALE_USER_MESSAGE,
      technicalMessage,
    };
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

      // Skip the freshness check on initial sync — Plaid hasn't run a
      // background pull yet, so last_successful_update may be unset.
      if (connection.transactionCursor !== null) {
        const freshness =
          await PlaidTransactionSyncWorkflow.checkItemFreshness(
            connection.plaidAccessToken,
          );
        if (
          freshness.kind === "stale" ||
          freshness.kind === "item_error"
        ) {
          const errorCode =
            freshness.kind === "item_error" ? "ITEM_LOGIN_REQUIRED" : "STALE_DATA";
          await PlaidTransactionSyncWorkflow.markError(
            syncJobId,
            freshness.userMessage,
            errorCode,
          );
          await PlaidTransactionSyncWorkflow.notifyDisconnect(
            input.userId,
            connectionId,
            freshness.userMessage,
          );
          return null;
        }
      }

      await PlaidTransactionSyncWorkflow.refreshBalances(
        connectionId,
        connection.plaidAccessToken,
      );

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
