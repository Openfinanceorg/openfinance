import type { Meta, StoryObj } from "@storybook/svelte";
import AccountsOverview from "./AccountsOverview.svelte";
import type { ConnectedAccount } from "@openfinance/shared";

const meta: Meta = {
  title: "Accounts/AccountsOverview",
  component: AccountsOverview as any,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj;

let nextId = 1;

function account(overrides: Partial<ConnectedAccount>): ConnectedAccount {
  return {
    id: nextId++,
    name: "Checking Account",
    officialName: null,
    type: "depository",
    subtype: "checking",
    mask: "4321",
    currentBalance: "5432.10",
    availableBalance: "5432.10",
    isoCurrencyCode: "USD",
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    syncError: null,
    isSyncing: false,
    connectionId: 1,
    provider: "plaid",
    quilttConnectionId: null,
    status: "active",
    ...overrides,
  };
}

const handlers = {
  onAddAccount: () => console.log("Add account"),
  onReauth: (a: ConnectedAccount) => console.log("Reauth", a.name),
  onAccountClick: (id: number) => console.log("Open account", id),
};

export const Default: Story = {
  args: {
    accounts: [
      account({ name: "Adv Plus Banking", mask: "8896", currentBalance: "143.67" }),
      account({
        name: "Visa Credit",
        type: "credit",
        subtype: "credit card",
        mask: "0310",
        currentBalance: "272.25",
      }),
      account({
        name: "Individual ...074",
        type: "investment",
        subtype: "brokerage",
        mask: "074",
        currentBalance: "789.84",
        institutionName: "Charles Schwab",
        institutionUrl: "https://www.schwab.com",
      }),
    ],
    ...handlers,
  },
};

/**
 * The case that motivated per-currency totals: holdings in more than one
 * currency. Balances are never converted, so each currency gets its own line —
 * largest first. Previously only the largest line was shown and the rest were
 * silently dropped.
 */
export const MultipleCurrencies: Story = {
  args: {
    accounts: [
      account({
        name: "CAD account",
        mask: "9794",
        currentBalance: "108997.67",
        isoCurrencyCode: "CAD",
        institutionName: "Wise (US)",
        institutionUrl: "https://wise.com",
      }),
      account({
        name: "CHECKING",
        subtype: "depository",
        mask: "7388",
        currentBalance: "77455.46",
        isoCurrencyCode: "CAD",
        institutionName: "CIBC Canada",
        institutionUrl: "https://www.cibc.com",
        provider: "quiltt",
      }),
      account({
        name: "XUEYANG WU -71004",
        type: "credit",
        subtype: "credit card",
        mask: "1004",
        currentBalance: "4272.65",
        isoCurrencyCode: "CAD",
        institutionName: "American Express (Canada)",
        institutionUrl: "https://www.americanexpress.com",
      }),
      account({
        name: "USD account",
        mask: "0537",
        currentBalance: "987.57",
        institutionName: "Wise (US)",
        institutionUrl: "https://wise.com",
      }),
      account({
        name: "Visa Credit",
        type: "credit",
        subtype: "credit card",
        mask: "0310",
        currentBalance: "272.25",
        institutionName: "Bank of America",
        institutionUrl: "https://www.bankofamerica.com",
      }),
      // Empty currency wallets are excluded from the totals entirely
      account({
        name: "EUR account",
        mask: "9484",
        currentBalance: "0.00",
        isoCurrencyCode: "EUR",
        institutionName: "Wise (US)",
        institutionUrl: "https://wise.com",
      }),
      account({
        name: "THB account",
        mask: "7422",
        currentBalance: "0.00",
        isoCurrencyCode: "THB",
        institutionName: "Wise (US)",
        institutionUrl: "https://wise.com",
      }),
    ],
    ...handlers,
  },
};

/** A connection that dropped out — the card surfaces a Reconnect action. */
export const NeedsReconnect: Story = {
  args: {
    accounts: [
      account({
        name: "chequing personal",
        mask: "2705",
        currentBalance: "3175.71",
        isoCurrencyCode: "CAD",
        institutionName: "Simplii Financial",
        institutionUrl: "https://www.simplii.com",
        syncError: {
          message: "LOGIN_REQUIRED",
          lastFailedAt: "2026-07-20T00:00:00Z",
        },
      }),
      account({ name: "Adv Plus Banking", mask: "8896", currentBalance: "143.67" }),
    ],
    ...handlers,
  },
};

/** Liabilities outweigh assets, so the total goes negative. */
export const NegativeTotal: Story = {
  args: {
    accounts: [
      account({ name: "Checking", mask: "1111", currentBalance: "250.00" }),
      account({
        name: "Visa Credit",
        type: "credit",
        subtype: "credit card",
        mask: "0310",
        currentBalance: "1840.55",
      }),
    ],
    ...handlers,
  },
};

/** One account, no carousel scrolling. */
export const SingleAccount: Story = {
  args: {
    accounts: [account({ name: "Checking", mask: "1111" })],
    ...handlers,
  },
};
