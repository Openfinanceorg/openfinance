import type {
  ConnectedAccount,
  GetTransactionsResponse,
  TransactionFilter,
} from "@openfinance/shared";

export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
}

export class OpenFinanceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async getAccounts(): Promise<{ accounts: ConnectedAccount[] }> {
    return this.request("/api/accounts");
  }

  async getTransactions(
    filter?: TransactionFilter,
  ): Promise<GetTransactionsResponse> {
    const params: Record<string, string> = {};
    if (filter?.startDate) params.startDate = filter.startDate;
    if (filter?.endDate) params.endDate = filter.endDate;
    if (filter?.searchText) params.search = filter.searchText;
    if (filter?.merchants?.length)
      params.merchants = filter.merchants.join(",");
    if (filter?.accountId !== undefined)
      params.accountId = String(filter.accountId);
    if (filter?.limit !== undefined) params.limit = String(filter.limit);
    if (filter?.cursor) params.cursor = filter.cursor;
    if (filter?.pending !== undefined) params.pending = String(filter.pending);
    if (filter?.status?.length) params.status = filter.status.join(",");

    return this.request("/api/transactions", params);
  }
}
