import type { ConnectedAccount } from "@openfinance/shared";

export interface AccountGroup {
  key: string;
  label: string;
  accounts: ConnectedAccount[];
  subtotal: number;
}

const GROUP_CONFIG = [
  { key: "banking", label: "Banking", types: ["depository"] },
  { key: "credit", label: "Credit Cards", types: ["credit"] },
  { key: "loans", label: "Loans", types: ["loan"] },
  { key: "investments", label: "Investments", types: ["investment"] },
] as const;

const LIABILITY_GROUPS = new Set(["credit", "loans"]);

export function isLiabilityGroup(groupKey: string): boolean {
  return LIABILITY_GROUPS.has(groupKey);
}

export function groupAccounts(accounts: ConnectedAccount[]): AccountGroup[] {
  const grouped = new Map<string, ConnectedAccount[]>();
  for (const config of GROUP_CONFIG) {
    grouped.set(config.key, []);
  }

  for (const account of accounts) {
    const config = GROUP_CONFIG.find((g) =>
      (g.types as readonly string[]).includes(account.type),
    );
    const key = config?.key ?? "banking";
    grouped.get(key)!.push(account);
  }

  return GROUP_CONFIG.filter(
    (config) => grouped.get(config.key)!.length > 0,
  ).map((config) => {
    const groupAccounts = grouped.get(config.key)!;
    const subtotal = groupAccounts.reduce(
      (sum, a) => sum + (a.currentBalance ? parseFloat(a.currentBalance) : 0),
      0,
    );
    return {
      key: config.key,
      label: config.label,
      accounts: groupAccounts,
      subtotal,
    };
  });
}

export function formatBalance(
  balance: string | null,
  currency: string | null,
): string {
  if (!balance) return "--";
  const num = parseFloat(balance);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
}

export function formatSubtotal(amount: number, isLiability: boolean): string {
  const display = isLiability ? -Math.abs(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(display);
}

export function formatAccountType(
  type: string,
  subtype: string | null,
): string {
  const display = subtype && subtype.toUpperCase() !== "NONE" ? subtype : type;
  return display.charAt(0).toUpperCase() + display.slice(1).replace(/_/g, " ");
}
