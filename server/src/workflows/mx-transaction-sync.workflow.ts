import { DBOS } from "@dbos-inc/dbos-sdk";
import { db } from "../db";
import { accountConnections, syncJobs } from "../schema";
import { eq } from "drizzle-orm";
import { mxService } from "../lib/sync/mx.service";

export class MxTransactionSyncWorkflow {
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
    userGuid: string;
    memberGuid: string;
  }) {
    return mxService.syncTransactions(params);
  }

  @DBOS.step()
  static async markStarted(syncJobId: number) {
    await db
      .update(syncJobs)
      .set({ startedAt: new Date(), updatedAt: new Date() })
      .where(eq(syncJobs.id, syncJobId));
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

  @DBOS.step()
  static async getUserGuid(userId: string): Promise<string | null> {
    const { user: userTable } = await import("../schema");
    const [row] = await db
      .select({ mxUserGuid: userTable.mxUserGuid })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    return row?.mxUserGuid ?? null;
  }

  @DBOS.workflow()
  static async run(input: {
    connectionId: number;
    userId: string;
    syncJobId: number;
  }) {
    const { connectionId, userId, syncJobId } = input;

    await MxTransactionSyncWorkflow.markStarted(syncJobId);

    const connection =
      await MxTransactionSyncWorkflow.fetchConnection(connectionId);

    if (!connection || !connection.mxMemberGuid) {
      await MxTransactionSyncWorkflow.markError(
        syncJobId,
        "Connection not found or missing MX member GUID",
      );
      return;
    }

    const userGuid = await MxTransactionSyncWorkflow.getUserGuid(userId);
    if (!userGuid) {
      await MxTransactionSyncWorkflow.markError(
        syncJobId,
        "User does not have an MX user GUID",
      );
      return;
    }

    try {
      const result = await MxTransactionSyncWorkflow.runSync({
        connectionId,
        userGuid,
        memberGuid: connection.mxMemberGuid,
      });

      await MxTransactionSyncWorkflow.markComplete(syncJobId, result.added);

      DBOS.logger.info(
        `MX transaction sync complete for connection ${connectionId}: +${result.added}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await MxTransactionSyncWorkflow.markError(syncJobId, message);
      DBOS.logger.error(
        `MX transaction sync failed for connection ${connectionId}: ${message}`,
      );
    }
  }
}
