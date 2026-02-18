<script lang="ts">
  import {
    createMxWidgetUrl,
    createMxWidgetUrlForUpdate,
    connectMxMember,
    getMxMemberStatus,
  } from "./api";
  import * as widgetSdk from "@mxenabled/web-widget-sdk";
  import { triggerPoll } from "./sync-status";
  import MXWidgetDialog from "./MXWidgetDialog.svelte";

  interface Props {
    onAccountLinked?: () => void;
    onSyncStarted?: () => void;
  }

  let { onAccountLinked = () => {}, onSyncStarted = () => {} }: Props =
    $props();

  // MX Widget State Machine
  type MXWidgetState =
    | "idle"
    | "loading_widget"
    | "widget_active"
    | "polling_aggregation";

  let widgetState = $state<MXWidgetState>("idle");
  let mxWidget = $state<any>(null);
  let currentInstitutionCode = $state<string | undefined>();

  let isDialogOpen = $derived(widgetState !== "idle");
  let isMXWidgetLoading = $derived(widgetState === "loading_widget");
  let isPollingConnection = $derived(widgetState === "polling_aggregation");

  $effect(() => {
    return () => {
      cleanupMXWidget();
    };
  });

  export async function initiateMXLink(institutionCode?: string) {
    if (widgetState !== "idle") return;

    currentInstitutionCode = institutionCode;
    widgetState = "loading_widget";

    try {
      const widgetData = await createMxWidgetUrl({
        institutionCode,
      });

      if (!widgetData?.widget_url) {
        throw new Error("Failed to retrieve MX widget URL.");
      }

      const widgetUrl = widgetData.widget_url;
      const userGuid = widgetData.user_guid;

      // Wait for dialog to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      mxWidget = new widgetSdk.ConnectWidget({
        container: "#mx-widget-container",
        url: widgetUrl,
        onLoaded: () => {
          widgetState = "widget_active";
        },
        onMemberConnected: (payload: any) => {
          handleMXSuccess(payload.member_guid, userGuid);
        },
        onCreateMemberError: () => {},
        onOAuthError: () => {},
        onBackToSearch: () => {
          cleanupMXWidget();
        },
      });
    } catch (error) {
      console.error("Error initiating MX link:", error);
      cleanupMXWidget();
    }
  }

  async function handleMXSuccess(memberGuid: string, userGuid: string) {
    try {
      await connectMxMember(memberGuid, userGuid, currentInstitutionCode);

      if (mxWidget) {
        mxWidget.unmount();
        mxWidget = null;
      }

      widgetState = "polling_aggregation";
      pollAggregationStatus(memberGuid);
    } catch (error) {
      console.error("Error handling MX success:", error);
      cleanupMXWidget();
    }
  }

  async function pollAggregationStatus(memberGuid: string) {
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 2000;

    const pollStatus = async () => {
      if (attempts >= maxAttempts) {
        finalizeMXConnection();
        return;
      }

      try {
        const status = await getMxMemberStatus(memberGuid);

        if (!status.is_being_aggregated && status.successfully_aggregated_at) {
          finalizeMXConnection();
        } else {
          attempts++;
          setTimeout(pollStatus, pollInterval);
        }
      } catch {
        finalizeMXConnection();
      }
    };

    await pollStatus();
  }

  async function finalizeMXConnection() {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onAccountLinked();
    onSyncStarted();
    triggerPoll();

    widgetState = "idle";
  }

  function cleanupMXWidget() {
    if (mxWidget) {
      mxWidget.unmount();
      mxWidget = null;
    }
    currentInstitutionCode = undefined;
    widgetState = "idle";
  }

  function handleDialogClose() {
    cleanupMXWidget();
  }

  export async function initiateReauthentication(accountId: number) {
    if (widgetState !== "idle") return;

    widgetState = "loading_widget";

    try {
      const widgetData = await createMxWidgetUrlForUpdate(accountId);
      if (!widgetData?.widget_url) {
        throw new Error("Failed to retrieve MX widget URL for update.");
      }

      const widgetUrl = widgetData.widget_url;
      const userGuid = widgetData.user_guid;
      const memberGuid = widgetData.member_guid;

      await new Promise((resolve) => setTimeout(resolve, 100));

      mxWidget = new widgetSdk.ConnectWidget({
        container: "#mx-widget-container",
        url: widgetUrl,
        onLoaded: () => {
          widgetState = "widget_active";
        },
        onMemberConnected: (payload: any) => {
          handleMXSuccess(memberGuid || payload.member_guid, userGuid);
        },
        onBackToSearch: () => {
          cleanupMXWidget();
        },
      });
    } catch (error) {
      console.error("Error initiating MX reauthorization:", error);
      cleanupMXWidget();
    }
  }
</script>

<MXWidgetDialog
  bind:isOpen={isDialogOpen}
  onClose={handleDialogClose}
  isLoading={isMXWidgetLoading}
  {isPollingConnection}
/>
