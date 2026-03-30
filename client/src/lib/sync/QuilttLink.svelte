<script module lang="ts">
  // Declare Quiltt global (loaded via script tag)
  declare const Quiltt: {
    authenticate: (token: string) => void;
    connect: (
      connectorId: string,
      options: {
        institution?: string;
        onLoad?: (metadata: QuilttMetadata) => void;
        onExitSuccess?: (metadata: QuilttMetadata) => void;
        onExitAbort?: (metadata: QuilttMetadata) => void;
        onExitError?: (metadata: QuilttMetadata) => void;
      },
    ) => { open: () => void };
    reconnect: (
      connectorId: string,
      options: {
        connectionId: string;
        onLoad?: (metadata: QuilttMetadata) => void;
        onExitSuccess?: (metadata: QuilttMetadata) => void;
        onExitAbort?: (metadata: QuilttMetadata) => void;
        onExitError?: (metadata: QuilttMetadata) => void;
      },
    ) => { open: () => void };
  };

  interface QuilttMetadata {
    connectorId: string;
    profileId?: string;
    connectionId?: string;
  }
</script>

<script lang="ts">
  import { createQuilttSession, quilttCallback } from "./api";
  import { triggerPoll } from "./sync-status";
  import { toast } from "svelte-sonner";

  interface Props {
    onAccountLinked?: () => void;
    onSyncStarted?: () => void;
  }

  let { onAccountLinked = () => {}, onSyncStarted = () => {} }: Props =
    $props();

  // State
  let isLinking = $state(false);
  let currentRegistryId = $state<number | undefined>();

  // SDK loading
  let quilttLoaded = false;

  async function loadQuilttSdk(): Promise<void> {
    if (
      quilttLoaded ||
      (typeof window !== "undefined" && (window as any).Quiltt)
    ) {
      quilttLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.quiltt.io/v1/connector.js";
      script.onload = () => {
        quilttLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Quiltt SDK"));
      document.head.appendChild(script);
    });
  }

  /**
   * Normalize institution name for Quiltt search.
   * Removes common suffixes that don't work with Quiltt search.
   */
  function normalizeInstitutionName(name: string): string {
    return name
      .replace(/\s*[-\u2013]\s*(Personal|Business|Corporate|Commercial)$/i, "")
      .replace(/\s*\((Personal|Business|Corporate|Commercial)\)$/i, "")
      .trim();
  }

  export async function initiateQuilttLink(
    institutionName?: string,
    institutionRegistryId?: number,
  ) {
    if (isLinking) return;

    isLinking = true;
    currentRegistryId = institutionRegistryId;

    try {
      await loadQuilttSdk();

      const sessionData = await createQuilttSession();

      Quiltt.authenticate(sessionData.token);

      const profileId = sessionData.profileId;

      const connector = Quiltt.connect(sessionData.connectorId, {
        institution: institutionName
          ? normalizeInstitutionName(institutionName)
          : undefined,
        onExitSuccess: (metadata) => {
          handleSuccess(metadata.connectionId!, profileId);
        },
        onExitAbort: () => {
          cleanup();
        },
        onExitError: (metadata) => {
          console.error("Quiltt connection error:", metadata);
          toast.error("Failed to connect account");
          cleanup();
        },
      });

      connector.open();
    } catch (error) {
      console.error("Quiltt link error:", error);
      toast.error("Failed to start account linking");
      cleanup();
    }
  }

  async function handleSuccess(connectionId: string, profileId: string) {
    try {
      toast.success("Account linked successfully!", {
        description: "We started syncing your transactions.",
      });

      await quilttCallback(connectionId, profileId, currentRegistryId);

      // Small delay to ensure server-side processing completes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onAccountLinked();
      onSyncStarted();
      triggerPoll();
    } catch (error) {
      console.error("Quiltt callback error:", error);
    } finally {
      cleanup();
    }
  }

  export async function initiateReauthentication(quilttConnectionId: string) {
    if (isLinking) return;

    isLinking = true;

    try {
      await loadQuilttSdk();

      const sessionData = await createQuilttSession();

      Quiltt.authenticate(sessionData.token);

      const profileId = sessionData.profileId;

      const connector = Quiltt.reconnect(sessionData.connectorId, {
        connectionId: quilttConnectionId,
        onExitSuccess: (metadata) => {
          handleSuccess(metadata.connectionId!, profileId);
        },
        onExitAbort: () => {
          cleanup();
        },
        onExitError: (metadata) => {
          console.error("Quiltt reconnection error:", metadata);
          toast.error("Failed to reconnect account");
          cleanup();
        },
      });

      connector.open();
    } catch (error) {
      console.error("Quiltt reconnect error:", error);
      toast.error("Failed to start account reconnection");
      cleanup();
    }
  }

  function cleanup() {
    isLinking = false;
    currentRegistryId = undefined;
  }
</script>
