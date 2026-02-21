/**
 * Transaction Poll Workflow
 *
 * Scheduled workflow that runs every 30 minutes to sync transactions for all
 * active account connections. Dispatches to provider-specific sync workflows
 * (Plaid cursor-based, MX date-filtered) with jitter to spread API load.
 */
import { DBOS, SchedulerMode } from "@dbos-inc/dbos-sdk";
import { db } from "../db";
import { accountConnections, syncJobs } from "../schema";
import { eq } from "drizzle-orm";
import { TransactionSyncWorkflow } from "./transaction-sync.workflow";
import { MxTransactionSyncWorkflow } from "./mx-transaction-sync.workflow";

interface PollResult {
  connectionsProcessed: number;
  errors: string[];
}

export class TransactionPollWorkflow {
  @DBOS.scheduled({
    crontab: "*/30 * * * *",
    mode: SchedulerMode.ExactlyOncePerIntervalWhenActive,
  })
  @DBOS.workflow()
  static async pollTransactions(
    schedTime?: Date,
    _atTime?: Date,
  ): Promise<PollResult> {
    DBOS.logger.info(
      `Starting transaction poll workflow (scheduled: ${schedTime?.toISOString() ?? "manual"})`,
    );

    // Add jitter (0–5 min) to spread API load
    if (schedTime) {
      const jitterMs = Math.floor(Math.random() * 5 * 60 * 1000);
      DBOS.logger.info(
        `Applying jitter delay of ${Math.round(jitterMs / 1000)}s`,
      );
      await DBOS.sleep(jitterMs);
    }

    const connections = await TransactionPollWorkflow.fetchActiveConnections();

    DBOS.logger.info(`Found ${connections.length} active connections to poll`);

    const errors: string[] = [];

    for (const connection of connections) {
      try {
        const syncJob = await TransactionPollWorkflow.createSyncJob(connection);

        if (connection.provider === "plaid") {
          await DBOS.startWorkflow(TransactionSyncWorkflow).run({
            connectionId: connection.id,
            userId: connection.userId,
            syncJobId: syncJob.id,
          });
        } else if (connection.provider === "mx") {
          await DBOS.startWorkflow(MxTransactionSyncWorkflow).run({
            connectionId: connection.id,
            userId: connection.userId,
            syncJobId: syncJob.id,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(
          `Connection ${connection.id} (${connection.provider}): ${message}`,
        );
        DBOS.logger.error(
          `Failed to dispatch sync for connection ${connection.id}: ${message}`,
        );
      }
    }

    DBOS.logger.info(
      `Transaction poll complete: ${connections.length} connections processed, ${errors.length} errors`,
    );

    return { connectionsProcessed: connections.length, errors };
  }

  @DBOS.step()
  static async fetchActiveConnections() {
    return db
      .select()
      .from(accountConnections)
      .where(eq(accountConnections.status, "active"));
  }

  @DBOS.step()
  static async createSyncJob(
    connection: typeof accountConnections.$inferSelect,
  ) {
    const [syncJob] = await db
      .insert(syncJobs)
      .values({
        userId: connection.userId,
        accountConnectionId: connection.id,
        provider: connection.provider,
        jobType: "transactions",
        status: "pending",
      })
      .returning();

    return syncJob;
  }
}
