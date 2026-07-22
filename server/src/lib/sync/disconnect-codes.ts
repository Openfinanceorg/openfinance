/**
 * Error codes that mean a connection is genuinely broken and the user has to
 * re-authenticate through the provider's Link flow.
 *
 * The codes are per-provider vocabulary, but every consumer asks the same
 * provider-neutral question — "must the user re-link?" — so the lists stay
 * private and only the predicate is exported. Lives outside the provider
 * clients because two of the three consumers are not Plaid, and importing
 * plaid.client would drag in the Plaid SDK and its env vars for a string list.
 *
 * Only codes here should ever produce a "Reconnect" prompt. A transient
 * failure (INSTITUTION_DOWN, a rate limit, an upstream pull still in progress)
 * must not tell the user to re-link, because re-linking will not help.
 */
const PLAID_DISCONNECT_CODES = [
  "ITEM_LOGIN_REQUIRED",
  "ITEM_LOCKED",
  "INVALID_CREDENTIALS",
  "INVALID_MFA",
  "ACCESS_NOT_GRANTED",
  "PASSWORD_RESET_REQUIRED",
];

/** Synthesized by the Quiltt sync workflow from an ERROR_REPAIRABLE status. */
const QUILTT_DISCONNECT_CODES = ["CONNECTION_EXPIRED"];

const RECONNECT_ERROR_CODES = [
  ...PLAID_DISCONNECT_CODES,
  ...QUILTT_DISCONNECT_CODES,
];

export function isReconnectErrorCode(code: string | null | undefined): boolean {
  return !!code && RECONNECT_ERROR_CODES.includes(code);
}
