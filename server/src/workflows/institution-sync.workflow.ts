import { DBOS, SchedulerMode } from "@dbos-inc/dbos-sdk";
import { PlaidInstitutionSyncer } from "$lib/sync/plaid-institution-syncer.js";

interface InstitutionSyncResult {
  success: boolean;
  message: string;
  institutionsRefreshed: boolean;
  healthStatusUpdated: boolean;
  errors?: string[];
  timestamp: string;
}

export class InstitutionSyncWorkflow {
  /**
   * Scheduled workflow: runs every 48 hours at 3 AM UTC
   */
  @DBOS.scheduled({
    crontab: "0 3 */2 * *",
    mode: SchedulerMode.ExactlyOncePerIntervalWhenActive,
  })
  @DBOS.workflow()
  static async syncInstitutionsWorkflow(
    schedTime?: Date,
    _atTime?: Date,
  ): Promise<InstitutionSyncResult> {
    DBOS.logger.info("Starting institution sync workflow", {
      scheduledTime: schedTime?.toISOString(),
    });

    const errors: string[] = [];
    let institutionsRefreshed = false;
    let healthStatusUpdated = false;

    // Step 1: Refresh institutions from Plaid
    try {
      await InstitutionSyncWorkflow.refreshInstitutions();
      institutionsRefreshed = true;
    } catch (error: any) {
      const errorMessage = `Failed to refresh institutions: ${error.message}`;
      DBOS.logger.error(errorMessage);
      errors.push(errorMessage);
    }

    // Step 2: Update connection health status
    try {
      await InstitutionSyncWorkflow.updateConnectionHealthStatus();
      healthStatusUpdated = true;
    } catch (error: any) {
      const errorMessage = `Failed to update connection health status: ${error.message}`;
      DBOS.logger.error(errorMessage);
      errors.push(errorMessage);
    }

    const success = errors.length === 0;

    const result: InstitutionSyncResult = {
      success,
      message: success
        ? "Institution sync completed successfully"
        : `Partial failure: ${errors.length} error(s) occurred`,
      institutionsRefreshed,
      healthStatusUpdated,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    DBOS.logger.info("Institution sync workflow completed", {
      success,
      institutionsRefreshed,
      healthStatusUpdated,
      errorCount: errors.length,
    });

    return result;
  }

  @DBOS.step()
  static async refreshInstitutions(): Promise<void> {
    const syncer = new PlaidInstitutionSyncer();
    await syncer.refreshInstitutions();
  }

  @DBOS.step()
  static async updateConnectionHealthStatus(): Promise<void> {
    const syncer = new PlaidInstitutionSyncer();
    await syncer.updateConnectionHealthStatus();
  }
}
