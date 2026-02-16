export type {
  SyncProvider,
  InstitutionType,
  SearchInstitutionsResponse,
} from "./institution";

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
  connectionId: number;
  provider: "plaid" | "mx";
}
