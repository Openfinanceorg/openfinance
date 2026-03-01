import { plaidClient, PLAID_COUNTRY_CODES } from "./plaid.client";
import { db } from "../../db";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { TransactionSyncWorkflow } from "../../workflows/plaid-transaction-sync.workflow";
import { sleep } from "../utils";
import {
  financialAccounts,
  accountConnections,
  syncJobs,
  institutionRegistry,
  transactions,
} from "../../schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { user as userTable } from "../../schema";

class PlaidService {
  async exchangePublicToken(publicToken: string) {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  }

  async getInstitutionInfo(institutionId: string) {
    const response = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: PLAID_COUNTRY_CODES,
      options: { include_optional_metadata: true },
    });
    return {
      name: response.data.institution.name,
      logo: response.data.institution.logo ?? null,
    };
  }

  async findRegistryId(institutionId: string): Promise<number | null> {
    const rows = await db
      .select({ id: institutionRegistry.id })
      .from(institutionRegistry)
      .where(
        eq(institutionRegistry.providerCompositeKey, `plaid_${institutionId}`),
      )
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async connectAndPerformInitialSync(params: {
    userId: string;
    institutionRegistryId: number | null;
    plaidItemId: string;
    plaidAccessToken: string;
  }) {
    const { userId, institutionRegistryId, plaidItemId, plaidAccessToken } =
      params;

    // Create account connection
    const [connection] = await db
      .insert(accountConnections)
      .values({
        userId,
        provider: "plaid",
        institutionRegistryId,
        plaidItemId,
        plaidAccessToken,
        status: "active",
      })
      .returning();

    const connectionId = connection.id;

    this.markFirstAccountConnected(userId);

    // Fetch and upsert accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: plaidAccessToken,
    });

    for (const account of accountsResponse.data.accounts) {
      await db
        .insert(financialAccounts)
        .values({
          userId,
          accountConnectionId: connectionId,
          providerAccountId: account.account_id,
          name: account.name,
          officialName: account.official_name ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          mask: account.mask ?? null,
          currentBalance: account.balances.current?.toString() ?? null,
          availableBalance: account.balances.available?.toString() ?? null,
          isoCurrencyCode: account.balances.iso_currency_code ?? null,
        })
        .onConflictDoUpdate({
          target: [
            financialAccounts.accountConnectionId,
            financialAccounts.providerAccountId,
          ],
          set: {
            name: account.name,
            officialName: account.official_name ?? null,
            type: account.type,
            subtype: account.subtype ?? null,
            mask: account.mask ?? null,
            currentBalance: account.balances.current?.toString() ?? null,
            availableBalance: account.balances.available?.toString() ?? null,
            isoCurrencyCode: account.balances.iso_currency_code ?? null,
            updatedAt: new Date(),
          },
        });
    }

    // Create a sync job for transactions
    const [syncJob] = await db
      .insert(syncJobs)
      .values({
        userId,
        accountConnectionId: connectionId,
        provider: "plaid",
        jobType: "transactions",
        status: "pending",
      })
      .returning();

    // Dispatch background workflow for transaction sync
    await DBOS.startWorkflow(TransactionSyncWorkflow).run({
      connectionId,
      userId,
      syncJobId: syncJob.id,
    });

    return { syncJobId: syncJob.id };
  }

  async syncTransactions(params: {
    connectionId: number;
    accessToken: string;
    cursor: string | null;
  }) {
    const { connectionId, accessToken, cursor } = params;

    // Get accounts for this connection to map account IDs
    const accounts = await db
      .select({
        id: financialAccounts.id,
        providerAccountId: financialAccounts.providerAccountId,
        userId: financialAccounts.userId,
      })
      .from(financialAccounts)
      .where(eq(financialAccounts.accountConnectionId, connectionId));

    const accountMap = new Map(accounts.map((a) => [a.providerAccountId, a]));

    let nextCursor = cursor ?? "";
    let added = 0;
    let modified = 0;
    let removed = 0;

    const initialDelay = 5000;
    const maxDelay = 30000;
    const maxRetries = 10;
    let retryIndex = 0;

    // Single loop: pages through results, then polls with backoff if NOT_READY
    for (;;) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: nextCursor || undefined,
      });

      const data = response.data;
      nextCursor = data.next_cursor;

      console.debug(
        `connection ${connectionId}: status=${data.transactions_update_status}, ` +
          `added=${data.added.length}, modified=${data.modified.length}, removed=${data.removed.length}, ` +
          `has_more=${data.has_more}`,
      );

      // Process added transactions
      for (const tx of data.added) {
        const account = accountMap.get(tx.account_id);
        if (!account) continue;

        await db
          .insert(transactions)
          .values({
            userId: account.userId,
            accountId: account.id,
            providerTransactionId: tx.transaction_id,
            name: tx.name,
            amount: tx.amount.toString(),
            isoCurrencyCode: tx.iso_currency_code ?? null,
            date: new Date(tx.date),
            authorizedDate: tx.authorized_date
              ? new Date(tx.authorized_date)
              : null,
            pending: tx.pending,
            merchantName: tx.merchant_name ?? null,
            raw: tx as unknown as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: [
              transactions.accountId,
              transactions.providerTransactionId,
            ],
            set: {
              name: tx.name,
              amount: tx.amount.toString(),
              isoCurrencyCode: tx.iso_currency_code ?? null,
              date: new Date(tx.date),
              authorizedDate: tx.authorized_date
                ? new Date(tx.authorized_date)
                : null,
              pending: tx.pending,
              merchantName: tx.merchant_name ?? null,
              raw: tx as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            },
          });
        added++;
      }

      // Process modified transactions
      for (const tx of data.modified) {
        const account = accountMap.get(tx.account_id);
        if (!account) continue;

        await db
          .insert(transactions)
          .values({
            userId: account.userId,
            accountId: account.id,
            providerTransactionId: tx.transaction_id,
            name: tx.name,
            amount: tx.amount.toString(),
            isoCurrencyCode: tx.iso_currency_code ?? null,
            date: new Date(tx.date),
            authorizedDate: tx.authorized_date
              ? new Date(tx.authorized_date)
              : null,
            pending: tx.pending,
            merchantName: tx.merchant_name ?? null,
            raw: tx as unknown as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: [
              transactions.accountId,
              transactions.providerTransactionId,
            ],
            set: {
              name: tx.name,
              amount: tx.amount.toString(),
              isoCurrencyCode: tx.iso_currency_code ?? null,
              date: new Date(tx.date),
              authorizedDate: tx.authorized_date
                ? new Date(tx.authorized_date)
                : null,
              pending: tx.pending,
              merchantName: tx.merchant_name ?? null,
              raw: tx as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            },
          });
        modified++;
      }

      // Process removed transactions
      for (const tx of data.removed) {
        if (!tx.transaction_id) continue;
        await db
          .update(transactions)
          .set({ status: "deleted", updatedAt: new Date() })
          .where(
            sql`${transactions.providerTransactionId} = ${tx.transaction_id}`,
          );
        removed++;
      }

      // More pages available — continue immediately
      if (data.has_more) continue;

      // During initial sync, keep polling until historical data is ready
      const isInitialSync = cursor === null;
      const needsMoreData =
        data.transactions_update_status !== "HISTORICAL_UPDATE_COMPLETE";

      if (isInitialSync && needsMoreData && retryIndex < maxRetries) {
        const delay = Math.min(initialDelay * 2 ** retryIndex, maxDelay);
        console.debug(
          `connection ${connectionId}: ${data.transactions_update_status}, retrying in ${delay}ms (attempt ${retryIndex + 1}/${maxRetries})`,
        );
        await sleep(delay);
        retryIndex++;
        continue;
      }

      break;
    }

    // Update cursor on connection
    await db
      .update(accountConnections)
      .set({
        transactionCursor: nextCursor,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accountConnections.id, connectionId));

    console.debug(
      `connection ${connectionId}: sync complete — added=${added}, modified=${modified}, removed=${removed}`,
    );

    return { nextCursor, added, modified, removed };
  }
  async itemRemove(accessToken: string): Promise<boolean> {
    try {
      await plaidClient.itemRemove({ access_token: accessToken });
      return true;
    } catch {
      return false;
    }
  }

  private markFirstAccountConnected(userId: string): void {
    db.update(userTable)
      .set({ firstAccountConnectedAt: new Date() })
      .where(
        and(
          eq(userTable.id, userId),
          isNull(userTable.firstAccountConnectedAt),
        ),
      )
      .then(
        () => {},
        () => {},
      );
  }
}

export const plaidService = new PlaidService();
