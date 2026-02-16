<script lang="ts" module>
  declare global {
    interface Window {
      Plaid: {
        create: (config: PlaidCreateConfig) => PlaidHandler;
      };
    }
  }

  interface PlaidCreateConfig {
    token: string;
    onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
    onExit: (err: PlaidError | null, metadata: PlaidExitMetadata) => void;
    onEvent: (eventName: string, metadata: Record<string, unknown>) => void;
  }

  interface PlaidHandler {
    open: () => void;
    exit: (options?: { force: boolean }) => void;
    destroy: () => void;
  }

  interface PlaidSuccessMetadata {
    institution: { institution_id: string; name: string } | null;
    accounts: Array<{
      id: string;
      name: string;
      mask: string;
      type: string;
      subtype: string;
    }>;
    link_session_id: string;
  }

  interface PlaidExitMetadata {
    institution: { institution_id: string; name: string } | null;
    status: string;
    link_session_id: string;
  }

  interface PlaidError {
    error_type: string;
    error_code: string;
    error_message: string;
    display_message: string | null;
  }
</script>

<script lang="ts">
  import { createPlaidLinkToken, exchangePlaidPublicToken } from "./api";

  interface Props {
    onAccountLinked?: () => void;
    onExit?: () => void;
  }

  let { onAccountLinked = () => {}, onExit = () => {} }: Props = $props();

  let handler: PlaidHandler | null = null;
  let sdkLoaded = $state(false);

  function loadPlaidSdk(): Promise<void> {
    if (sdkLoaded || window.Plaid) {
      sdkLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
      script.onload = () => {
        sdkLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  export async function initiatePlaidLink(institutionId?: string) {
    await loadPlaidSdk();

    const { link_token } = await createPlaidLinkToken();

    handler = window.Plaid.create({
      token: link_token,
      onSuccess: async (publicToken, metadata) => {
        try {
          await exchangePlaidPublicToken(
            publicToken,
            metadata.institution?.institution_id ?? institutionId,
          );
          onAccountLinked();
        } catch (err) {
          console.error("Failed to exchange token:", err);
        }
      },
      onExit: (_err, _metadata) => {
        handler = null;
        onExit();
      },
      onEvent: (_eventName, _metadata) => {},
    });

    handler.open();
  }
</script>
