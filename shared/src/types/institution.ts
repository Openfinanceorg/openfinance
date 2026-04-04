export type SyncProvider = "plaid" | "mx" | "quiltt";

export interface InstitutionType {
  id: string;
  name: string;
  logo?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  url?: string | null;
  plaidData?: {
    institutionId: string;
    countryCodes: string[];
    oauth: boolean;
    products: string[];
    routingNumbers: string[];
    connectionHealth?: {
      item_logins?: {
        status: "HEALTHY" | "DEGRADED" | "DOWN";
        last_status_change: string;
        breakdown: {
          success: number;
          error_institution: number;
          error_plaid: number;
        };
      };
      transactions_updates?: {
        status: "HEALTHY" | "DEGRADED" | "DOWN";
        last_status_change: string;
        breakdown: {
          success: number;
          error_institution: number;
          error_plaid: number;
          refresh_interval?: "NORMAL" | "DELAYED";
        };
      };
      lastUpdated: string;
    };
  } | null;
  mxData?: {
    institutionCode: string;
    name: string;
    url?: string | null;
    smallLogoUrl?: string | null;
    mediumLogoUrl?: string | null;
    supportsAccountIdentification?: boolean;
    supportsTransactionHistory?: boolean;
    supportsAccountStatement?: boolean;
    supportsAccountVerification?: boolean;
  } | null;
  mastercardData?: {
    institutionId: string;
    name: string;
    oauthEnabled: boolean;
    status: string;
    urlHomeApp?: string | null;
    accountTypeDescription?: string | null;
    branding?: {
      logo?: string | null;
      icon?: string | null;
      primaryColor?: string | null;
    } | null;
  } | null;
  providers?: SyncProvider[];
  matchConfidence?: number;
  rank?: number;
}

export interface SearchInstitutionsResponse {
  institutions: InstitutionType[];
}
