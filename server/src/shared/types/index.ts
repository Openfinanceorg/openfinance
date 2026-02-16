export type {
  SyncProvider,
  InstitutionType,
  SearchInstitutionsResponse,
} from "./institution";

export type {
  ApiTransaction,
  GetTransactionsResponse,
  TransactionFilter,
  TransactionStatus,
  SortOption,
  SortField,
  SortOrder,
  AmountFilter,
  Operator,
} from "./transaction";

export interface ConnectedAccount {
  id: number;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: string | null;
  availableBalance: string | null;
  isoCurrencyCode: string | null;
  institutionName: string;
  institutionLogo: string | null;
  institutionUrl: string | null;
  syncError: { message: string; lastFailedAt: string } | null;
  isSyncing: boolean;
  connectionId: number;
  provider: "plaid" | "mx";
}
