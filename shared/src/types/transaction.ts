export type Operator = ">" | "<" | ">=" | "<=" | "=";

export interface AmountFilter {
  operator: Operator;
  amount: number;
}

export type SortField = "date" | "amount" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface SortOption {
  orderField: SortField;
  ordering: SortOrder;
}

export type TransactionStatus = "active" | "hidden" | "deleted";

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  searchText?: string;
  searchPatterns?: string[];
  merchants?: string[];
  amountFilters?: AmountFilter[];
  sort?: SortOption;
  accountId?: number;
  limit?: number;
  cursor?: string;
  pending?: boolean;
  status?: TransactionStatus[];
  fields?: string[];
}

export interface ApiTransaction {
  id: number;
  userId: string;
  accountId: number;
  providerTransactionId: string;
  name: string;
  amount: number;
  isoCurrencyCode: string | null;
  date: string;
  authorizedDate: string | null;
  pending: boolean;
  merchantName: string | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GetTransactionsResponse {
  transactions: ApiTransaction[];
}

export interface QueryTransactionsRequest {
  sql: string;
}

export interface QueryTransactionsResponse {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface QueryTransactionsErrorResponse {
  error: string;
}
