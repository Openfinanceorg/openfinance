import { apiFetch } from "$lib/api-client";
import type {
  GetTransactionsResponse,
  TransactionFilter,
} from "@openfinance/shared";

export function fetchTransactions(params?: TransactionFilter) {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(
          key,
          Array.isArray(value) ? JSON.stringify(value) : String(value),
        );
      }
    }
  }
  const query = searchParams.toString();
  return apiFetch<GetTransactionsResponse>(
    `/api/transactions${query ? `?${query}` : ""}`,
  );
}
