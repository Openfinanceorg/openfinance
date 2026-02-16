import { db } from "../db";
import {
  financialAccounts,
  accountConnections,
  institutionRegistry,
  syncJobs,
  type FinancialAccount,
  type NewFinancialAccount,
} from "../schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import type { ConnectedAccount } from "@openfinance/shared";

interface SyncError {
  message: string;
  lastFailedAt: string;
}

class FinancialAccountService {
  async getAccountsByUserId(userId: string): Promise<ConnectedAccount[]> {
    const rows = await db
      .select({
        account: financialAccounts,
        connectionId: accountConnections.id,
        provider: accountConnections.provider,
        institutionName: institutionRegistry.name,
        institutionLogo: institutionRegistry.logo,
        institutionUrl: institutionRegistry.url,
      })
      .from(financialAccounts)
      .innerJoin(
        accountConnections,
        eq(financialAccounts.accountConnectionId, accountConnections.id),
      )
      .leftJoin(
        institutionRegistry,
        eq(accountConnections.institutionRegistryId, institutionRegistry.id),
      )
      .where(eq(financialAccounts.userId, userId));

    const connectionIds = [...new Set(rows.map((r) => r.connectionId))];
    const syncErrorMap = await this.getSyncErrors(connectionIds);
    const syncingConnections = await this.getSyncingConnections(connectionIds);

    return rows.map((row) => ({
      id: row.account.id,
      name: row.account.name,
      officialName: row.account.officialName,
      type: row.account.type,
      subtype: row.account.subtype,
      mask: row.account.mask,
      currentBalance: row.account.currentBalance,
      availableBalance: row.account.availableBalance,
      isoCurrencyCode: row.account.isoCurrencyCode,
      institutionName: row.institutionName ?? "Unknown",
      institutionLogo: row.institutionLogo ?? null,
      institutionUrl: row.institutionUrl ?? null,
      syncError: syncErrorMap.get(row.connectionId) ?? null,
      isSyncing: syncingConnections.has(row.connectionId),
      connectionId: row.connectionId,
      provider: row.provider,
    }));
  }

  async getAccountById(
    accountId: number,
    userId: string,
  ): Promise<ConnectedAccount | undefined> {
    const rows = await db
      .select({
        account: financialAccounts,
        connectionId: accountConnections.id,
        provider: accountConnections.provider,
        institutionName: institutionRegistry.name,
        institutionLogo: institutionRegistry.logo,
        institutionUrl: institutionRegistry.url,
      })
      .from(financialAccounts)
      .innerJoin(
        accountConnections,
        eq(financialAccounts.accountConnectionId, accountConnections.id),
      )
      .leftJoin(
        institutionRegistry,
        eq(accountConnections.institutionRegistryId, institutionRegistry.id),
      )
      .where(eq(financialAccounts.id, accountId))
      .limit(1);

    const row = rows[0];
    if (!row || row.account.userId !== userId) return undefined;

    const syncErrorMap = await this.getSyncErrors([row.connectionId]);
    const syncingConnections = await this.getSyncingConnections([
      row.connectionId,
    ]);

    return {
      id: row.account.id,
      name: row.account.name,
      officialName: row.account.officialName,
      type: row.account.type,
      subtype: row.account.subtype,
      mask: row.account.mask,
      currentBalance: row.account.currentBalance,
      availableBalance: row.account.availableBalance,
      isoCurrencyCode: row.account.isoCurrencyCode,
      institutionName: row.institutionName ?? "Unknown",
      institutionLogo: row.institutionLogo ?? null,
      institutionUrl: row.institutionUrl ?? null,
      syncError: syncErrorMap.get(row.connectionId) ?? null,
      isSyncing: syncingConnections.has(row.connectionId),
      connectionId: row.connectionId,
      provider: row.provider,
    };
  }

  async upsertAccount(
    data: Omit<NewFinancialAccount, "id" | "createdAt" | "updatedAt">,
  ): Promise<FinancialAccount> {
    const [result] = await db
      .insert(financialAccounts)
      .values(data)
      .onConflictDoUpdate({
        target: [
          financialAccounts.accountConnectionId,
          financialAccounts.providerAccountId,
        ],
        set: {
          name: data.name,
          officialName: data.officialName,
          type: data.type,
          subtype: data.subtype,
          mask: data.mask,
          currentBalance: data.currentBalance,
          availableBalance: data.availableBalance,
          isoCurrencyCode: data.isoCurrencyCode,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  async getAccountsByConnectionId(
    connectionId: number,
  ): Promise<FinancialAccount[]> {
    return db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.accountConnectionId, connectionId));
  }

  private async getSyncingConnections(
    connectionIds: number[],
  ): Promise<Set<number>> {
    if (connectionIds.length === 0) return new Set();

    const pendingJobs = await db
      .select({ accountConnectionId: syncJobs.accountConnectionId })
      .from(syncJobs)
      .where(
        and(
          inArray(syncJobs.accountConnectionId, connectionIds),
          eq(syncJobs.status, "pending"),
        ),
      );

    return new Set(pendingJobs.map((j) => j.accountConnectionId));
  }

  private async getSyncErrors(
    connectionIds: number[],
  ): Promise<Map<number, SyncError>> {
    if (connectionIds.length === 0) return new Map();

    const latestJobs = await db
      .selectDistinctOn([syncJobs.accountConnectionId], {
        accountConnectionId: syncJobs.accountConnectionId,
        errorMessage: syncJobs.errorMessage,
        completedAt: syncJobs.completedAt,
        status: syncJobs.status,
      })
      .from(syncJobs)
      .where(inArray(syncJobs.accountConnectionId, connectionIds))
      .orderBy(
        syncJobs.accountConnectionId,
        desc(syncJobs.createdAt),
        desc(syncJobs.id),
      );

    const errorMap = new Map<number, SyncError>();
    for (const job of latestJobs) {
      if (job.status === "error" && job.errorMessage) {
        errorMap.set(job.accountConnectionId, {
          message: job.errorMessage,
          lastFailedAt: (job.completedAt ?? new Date()).toISOString(),
        });
      }
    }

    return errorMap;
  }
}

export const financialAccountService = new FinancialAccountService();
