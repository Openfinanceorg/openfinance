import { DBOS } from "@dbos-inc/dbos-sdk";
import { db } from "../db";
import { accountConnections, syncJobs } from "../schema";
import { eq } from "drizzle-orm";
import { plaidService } from "../lib/sync/plaid.service";

export class TransactionSyncWorkflow {
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
  static async markError(syncJobId: number, errorMessage: string) {
    await db
      .update(syncJobs)
      .set({
        status: "error",
        completedAt: new Date(),
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, syncJobId));
  }

  @DBOS.workflow()
  static async run(input: {
    connectionId: number;
    userId: string;
    syncJobId: number;
  }): Promise<{ added: number; modified: number; removed: number } | null> {
    const { connectionId, syncJobId } = input;

    await TransactionSyncWorkflow.markStarted(syncJobId);

    const connection =
      await TransactionSyncWorkflow.fetchConnection(connectionId);

    if (!connection || !connection.plaidAccessToken) {
      await TransactionSyncWorkflow.markError(
        syncJobId,
        "Connection not found or missing access token",
      );
      return null;
    }

    try {
      const result = await TransactionSyncWorkflow.runSync({
        connectionId,
        accessToken: connection.plaidAccessToken,
        cursor: connection.transactionCursor,
      });

      const total = result.added + result.modified + result.removed;
      await TransactionSyncWorkflow.markComplete(syncJobId, total);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await TransactionSyncWorkflow.markError(syncJobId, message);
      DBOS.logger.error(
        `Transaction sync failed for connection ${connectionId}: ${message}`,
      );
      return null;
    }
  }
}
