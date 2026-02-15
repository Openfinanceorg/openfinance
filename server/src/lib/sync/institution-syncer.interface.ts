/**
 * Interface for provider-specific institution syncers
 * Each provider implements this to handle their own sync logic
 */
export interface InstitutionSyncer {
  /**
   * Refresh institutions from the provider and sync to database
   * @param limit Optional limit on number of institutions to sync
   */
  refreshInstitutions(limit?: number): Promise<void>;

  /**
   * Get the provider name
   */
  getProviderName(): string;
}

/**
 * Common sync result interface
 */
export interface SyncResult {
  success: boolean;
  totalInstitutions: number;
  totalBatches: number;
  error?: string;
}
