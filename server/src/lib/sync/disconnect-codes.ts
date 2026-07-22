/**
 * Provider error codes that mean a connection is genuinely broken and the user
 * has to re-authenticate through the provider's Link flow.
 *
 * Kept provider-neutral because the consumers are: the Plaid sync workflow, the
 * cross-provider transaction poller, and the accounts service that decides
 * whether to show a "Reconnect" prompt. Only codes in this list should ever
 * produce that prompt — a transient failure (INSTITUTION_DOWN, a rate limit, an
 * upstream pull still in progress) must not tell the user to re-link, because
 * re-linking will not help.
 */
export const PLAID_DISCONNECT_ERROR_CODES = [
  "ITEM_LOGIN_REQUIRED",
  "ITEM_LOCKED",
  "INVALID_CREDENTIALS",
  "INVALID_MFA",
  "ACCESS_NOT_GRANTED",
  "PASSWORD_RESET_REQUIRED",
];

/** Every code, across providers, that warrants a reconnect prompt. */
export const RECONNECT_ERROR_CODES = [
  "CONNECTION_EXPIRED",
  ...PLAID_DISCONNECT_ERROR_CODES,
];

export function isReconnectErrorCode(code: string | null | undefined): boolean {
  return !!code && RECONNECT_ERROR_CODES.includes(code);
}
